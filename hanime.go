package main

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/chromedp/cdproto/network"
	"github.com/chromedp/chromedp"
)

type CatalogItem struct {
	ID           int      `json:"id"`
	Name         string   `json:"name"`
	SearchTitles string   `json:"search_titles"`
	Slug         string   `json:"slug"`
	Description  string   `json:"description"`
	Views        int64    `json:"views"`
	CoverURL     string   `json:"cover_url"`
	Brand        string   `json:"brand"`
	BrandID      any      `json:"brand_id"`
	Likes        int      `json:"likes"`
	Tags         []string `json:"tags"`
	CreatedAt    string   `json:"created_at"`
	ReleasedAt   string   `json:"released_at"`
}

type CatalogResponse struct {
	Data []CatalogItem `json:"data"`
}

type VideoCard struct {
	ID       int      `json:"id,omitempty"`
	Title    string   `json:"title"`
	Slug     string   `json:"slug"`
	URL      string   `json:"url"`
	CoverURL string   `json:"cover_url"`
	Views    string   `json:"views,omitempty"`
	Brand    string   `json:"brand,omitempty"`
	Tags     []string `json:"tags,omitempty"`
}

type HomeSection struct {
	Name   string      `json:"name"`
	Total  int         `json:"total"`
	Videos []VideoCard `json:"videos"`
}

type StreamSource struct {
	Quality string `json:"quality"`
	Width   int    `json:"width"`
	Height  int    `json:"height"`
	Type    string `json:"type"`
	URL     string `json:"url"`
}

type VideoDetail struct {
	ID         int            `json:"id,omitempty"`
	Title      string         `json:"title"`
	Slug       string         `json:"slug"`
	PageURL    string         `json:"page_url"`
	CoverURL   string         `json:"cover_url"`
	Brand      string         `json:"brand,omitempty"`
	BrandURL   string         `json:"brand_url,omitempty"`
	Uploads    string         `json:"uploads,omitempty"`
	ReleasedAt string         `json:"released_at,omitempty"`
	UploadedAt string         `json:"uploaded_at,omitempty"`
	Likes      int            `json:"likes,omitempty"`
	Dislikes   int            `json:"dislikes,omitempty"`
	Genres     []string       `json:"genres"`
	Synopsis   string         `json:"synopsis,omitempty"`
	Streams    []StreamSource `json:"streams"`
}

type PagedResult struct {
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalHits  int         `json:"total_hits"`
	TotalPages int         `json:"total_pages"`
	Results    []VideoCard `json:"results"`
}

type ScrapeResult struct {
	Success   bool   `json:"success"`
	Mode      string `json:"mode"`
	Data      any    `json:"data,omitempty"`
	Error     string `json:"error,omitempty"`
	Timestamp int64  `json:"timestamp"`
}

type TokenPayload struct {
	V    int    `json:"v"`
	Alg  string `json:"alg"`
	Iv   string `json:"iv"`
	Tag  string `json:"tag"`
	Data string `json:"data"`
}

type DecryptedHandshake struct {
	Sources []struct {
		Src    string `json:"src"`
		Type   string `json:"type"`
		Height int    `json:"height"`
		Width  int    `json:"width"`
		Label  string `json:"label"`
		Kind   string `json:"kind"`
	} `json:"sources"`
}

func base64UrlDecode(str string) ([]byte, error) {
	s := strings.ReplaceAll(str, "-", "+")
	s = strings.ReplaceAll(s, "_", "/")
	for len(s)%4 != 0 {
		s += "="
	}
	return base64.StdEncoding.DecodeString(s)
}

func decryptHandshakeToken(xTokenBase64 string) (*DecryptedHandshake, error) {
	decodedJsonBytes, err := base64UrlDecode(xTokenBase64)
	if err != nil {
		return nil, err
	}

	var payload TokenPayload
	if err := json.Unmarshal(decodedJsonBytes, &payload); err != nil {
		return nil, err
	}

	keyHash := sha256.Sum256([]byte("htv-insecure-handshake-v1"))
	block, err := aes.NewCipher(keyHash[:])
	if err != nil {
		return nil, err
	}

	aesGCM, err := cipher.NewGCMWithNonceSize(block, 12)
	if err != nil {
		return nil, err
	}

	iv, err := base64UrlDecode(payload.Iv)
	if err != nil {
		return nil, err
	}

	tag, err := base64UrlDecode(payload.Tag)
	if err != nil {
		return nil, err
	}

	data, err := base64UrlDecode(payload.Data)
	if err != nil {
		return nil, err
	}

	ciphertextWithTag := append(data, tag...)
	additionalData := []byte("htv-insecure-v1")

	plaintext, err := aesGCM.Open(nil, iv, ciphertextWithTag, additionalData)
	if err != nil {
		return nil, err
	}

	var handshakeResult DecryptedHandshake
	if err := json.Unmarshal(plaintext, &handshakeResult); err != nil {
		return nil, err
	}

	return &handshakeResult, nil
}

func fetchCatalog() ([]CatalogItem, error) {
	cachePath := filepath.Join(os.TempDir(), "hanime_catalog_cache.json")
	if info, err := os.Stat(cachePath); err == nil {
		if time.Since(info.ModTime()) < 2*time.Hour {
			cachedBytes, err := os.ReadFile(cachePath)
			if err == nil {
				var catalog CatalogResponse
				if err := json.Unmarshal(cachedBytes, &catalog); err == nil && len(catalog.Data) > 0 {
					return catalog.Data, nil
				}
			}
		}
	}

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest(http.MethodGet, "https://guest.freeanimehentai.net/api/v11/search_hvs", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var catalog CatalogResponse
	if err := json.Unmarshal(bodyBytes, &catalog); err != nil {
		return nil, err
	}

	_ = os.WriteFile(cachePath, bodyBytes, 0644)

	return catalog.Data, nil
}

func ScrapeHome() ScrapeResult {
	startTime := time.Now().UnixMilli()

	client := &http.Client{Timeout: 20 * time.Second}
	req, err := http.NewRequest(http.MethodGet, "https://hanime.tv", nil)
	if err != nil {
		return ScrapeResult{Success: false, Mode: "home", Error: err.Error(), Timestamp: startTime}
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := client.Do(req)
	if err != nil {
		return ScrapeResult{Success: false, Mode: "home", Error: err.Error(), Timestamp: startTime}
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return ScrapeResult{Success: false, Mode: "home", Error: err.Error(), Timestamp: startTime}
	}

	sections := make([]HomeSection, 0)

	doc.Find("astro-island").Each(func(i int, island *goquery.Selection) {
		optsAttr := island.AttrOr("opts", "")
		if !strings.Contains(optsAttr, "CardSlider") {
			return
		}

		propsAttr := island.AttrOr("props", "")
		titleName := "Featured"
		if strings.Contains(propsAttr, "Trending") {
			titleName = "Trending"
		} else if strings.Contains(propsAttr, "Recent Uploads") {
			titleName = "Recent Uploads"
		} else if strings.Contains(propsAttr, "New Releases") {
			titleName = "New Releases"
		} else if strings.Contains(propsAttr, "Random") {
			titleName = "Random"
		}

		cards := make([]VideoCard, 0)
		island.Find("a[href^='/videos/hentai/']").Each(func(j int, a *goquery.Selection) {
			href := a.AttrOr("href", "")
			if href == "" {
				return
			}

			title := strings.TrimSpace(a.Find("h3").Text())
			if title == "" {
				title = a.AttrOr("title", "")
			}

			cover := a.Find("img").AttrOr("src", "")
			views := strings.TrimSpace(a.Find("span").Last().Text())
			slug := strings.TrimPrefix(href, "/videos/hentai/")

			cards = append(cards, VideoCard{
				Title:    title,
				Slug:     slug,
				URL:      "https://hanime.tv" + href,
				CoverURL: cover,
				Views:    views,
			})
		})

		if len(cards) > 0 {
			sections = append(sections, HomeSection{
				Name:   titleName,
				Total:  len(cards),
				Videos: cards,
			})
		}
	})

	return ScrapeResult{
		Success:   true,
		Mode:      "home",
		Data:      sections,
		Timestamp: startTime,
	}
}

func ScrapeTrending(page int, timespan string) ScrapeResult {
	startTime := time.Now().UnixMilli()

	if page < 1 {
		page = 1
	}
	if timespan == "" {
		timespan = "monthly"
	}

	targetURL := fmt.Sprintf("https://hanime.tv/browse/trending?time=%s&page=%d", timespan, page)

	client := &http.Client{Timeout: 20 * time.Second}
	req, err := http.NewRequest(http.MethodGet, targetURL, nil)
	if err != nil {
		return ScrapeResult{Success: false, Mode: "trending", Error: err.Error(), Timestamp: startTime}
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	resp, err := client.Do(req)
	if err != nil {
		return ScrapeResult{Success: false, Mode: "trending", Error: err.Error(), Timestamp: startTime}
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return ScrapeResult{Success: false, Mode: "trending", Error: err.Error(), Timestamp: startTime}
	}

	results := make([]VideoCard, 0)
	doc.Find("a[href^='/videos/hentai/']").Each(func(i int, a *goquery.Selection) {
		href := a.AttrOr("href", "")
		if href == "" {
			return
		}

		title := strings.TrimSpace(a.Find("h3").Text())
		if title == "" {
			title = a.AttrOr("title", "")
		}
		cover := a.Find("img").AttrOr("src", "")
		views := strings.TrimSpace(a.Find("span").Last().Text())
		slug := strings.TrimPrefix(href, "/videos/hentai/")

		results = append(results, VideoCard{
			Title:    title,
			Slug:     slug,
			URL:      "https://hanime.tv" + href,
			CoverURL: cover,
			Views:    views,
		})
	})

	return ScrapeResult{
		Success: true,
		Mode:    "trending",
		Data: PagedResult{
			Page:       page,
			Limit:      len(results),
			TotalHits:  len(results),
			TotalPages: 143,
			Results:    results,
		},
		Timestamp: startTime,
	}
}

func QueryCatalog(query string, tagFilter string, brandFilter string, sortBy string, page int, limit int) ScrapeResult {
	startTime := time.Now().UnixMilli()

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 24
	}

	items, err := fetchCatalog()
	if err != nil {
		return ScrapeResult{Success: false, Mode: "search", Error: err.Error(), Timestamp: startTime}
	}

	qClean := strings.ToLower(strings.TrimSpace(query))
	tagClean := strings.ToLower(strings.TrimSpace(tagFilter))
	brandClean := strings.ToLower(strings.TrimSpace(brandFilter))

	filtered := make([]CatalogItem, 0, len(items))

	for _, item := range items {
		if qClean != "" {
			nameMatch := strings.Contains(strings.ToLower(item.Name), qClean)
			aliasMatch := strings.Contains(strings.ToLower(item.SearchTitles), qClean)
			descMatch := strings.Contains(strings.ToLower(item.Description), qClean)
			brandMatch := strings.Contains(strings.ToLower(item.Brand), qClean)
			if !nameMatch && !aliasMatch && !descMatch && !brandMatch {
				continue
			}
		}

		if tagClean != "" {
			hasTag := false
			for _, t := range item.Tags {
				if strings.EqualFold(t, tagClean) || strings.Contains(strings.ToLower(t), tagClean) {
					hasTag = true
					break
				}
			}
			if !hasTag {
				continue
			}
		}

		if brandClean != "" {
			if !strings.EqualFold(item.Brand, brandClean) && !strings.Contains(strings.ToLower(item.Brand), brandClean) {
				continue
			}
		}

		filtered = append(filtered, item)
	}

	switch sortBy {
	case "views", "popular":
		sort.Slice(filtered, func(i, j int) bool {
			return filtered[i].Views > filtered[j].Views
		})
	case "likes":
		sort.Slice(filtered, func(i, j int) bool {
			return filtered[i].Likes > filtered[j].Likes
		})
	case "released":
		sort.Slice(filtered, func(i, j int) bool {
			return filtered[i].ReleasedAt > filtered[j].ReleasedAt
		})
	default:
		if qClean == "" {
			sort.Slice(filtered, func(i, j int) bool {
				return filtered[i].CreatedAt > filtered[j].CreatedAt
			})
		}
	}

	totalHits := len(filtered)
	totalPages := (totalHits + limit - 1) / limit

	startIdx := (page - 1) * limit
	if startIdx > totalHits {
		startIdx = totalHits
	}
	endIdx := startIdx + limit
	if endIdx > totalHits {
		endIdx = totalHits
	}

	pageSlice := filtered[startIdx:endIdx]
	results := make([]VideoCard, 0, len(pageSlice))

	for _, item := range pageSlice {
		viewsStr := fmt.Sprintf("%d", item.Views)
		if item.Views >= 1000000 {
			viewsStr = fmt.Sprintf("%.1fM", float64(item.Views)/1000000.0)
		} else if item.Views >= 1000 {
			viewsStr = fmt.Sprintf("%.1fK", float64(item.Views)/1000.0)
		}

		results = append(results, VideoCard{
			ID:       item.ID,
			Title:    item.Name,
			Slug:     item.Slug,
			URL:      "https://hanime.tv/videos/hentai/" + item.Slug,
			CoverURL: item.CoverURL,
			Views:    viewsStr,
			Brand:    item.Brand,
			Tags:     item.Tags,
		})
	}

	modeName := "search"
	if tagFilter != "" && query == "" {
		modeName = "tag"
	} else if brandFilter != "" && query == "" {
		modeName = "brand"
	}

	return ScrapeResult{
		Success: true,
		Mode:    modeName,
		Data: PagedResult{
			Page:       page,
			Limit:      limit,
			TotalHits:  totalHits,
			TotalPages: totalPages,
			Results:    results,
		},
		Timestamp: startTime,
	}
}

func parseVideoMetadata(htmlContent string, slug string, targetURL string) VideoDetail {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(htmlContent))
	if err != nil {
		return VideoDetail{Slug: slug, PageURL: targetURL}
	}

	details := doc.Find("#VideoDetails")
	title := strings.TrimSpace(details.Find("h1").Text())
	coverURL := details.Find("img").AttrOr("src", "")

	brandEl := details.Find("a[href^='/browse/brands/']")
	brand := strings.TrimSpace(brandEl.Find("strong").Text())
	if brand == "" {
		brand = strings.TrimSpace(brandEl.Text())
	}
	brandURL := ""
	if bHref, ok := brandEl.Attr("href"); ok {
		brandURL = "https://hanime.tv" + bHref
	}

	genres := make([]string, 0)
	genreSeen := make(map[string]bool)
	details.Find("a[href^='/browse/tags/']").Each(func(i int, s *goquery.Selection) {
		t := strings.TrimSpace(s.Text())
		if t != "" && !genreSeen[strings.ToLower(t)] {
			genreSeen[strings.ToLower(t)] = true
			genres = append(genres, t)
		}
	})

	uploads := ""
	releasedAt := ""
	uploadedAt := ""

	details.Find("span, div").Each(func(i int, s *goquery.Selection) {
		txt := strings.TrimSpace(s.Text())
		if strings.HasPrefix(txt, "Uploads") {
			uploads = strings.TrimSpace(s.Find("strong").Text())
		} else if strings.HasPrefix(txt, "Released") {
			tip := s.Find("button[data-tip]").AttrOr("data-tip", "")
			if tip != "" {
				releasedAt = tip
			} else {
				releasedAt = strings.TrimSpace(s.Find("strong").Text())
			}
		} else if strings.HasPrefix(txt, "Uploaded") {
			tip := s.Find("button[data-tip]").AttrOr("data-tip", "")
			if tip != "" {
				uploadedAt = tip
			} else {
				uploadedAt = strings.TrimSpace(s.Find("strong").Text())
			}
		}
	})

	var synopsisBuilder strings.Builder
	doc.Find("div[data-expand-content] p").Each(func(i int, p *goquery.Selection) {
		pTxt := strings.TrimSpace(p.Text())
		if pTxt != "" {
			if synopsisBuilder.Len() > 0 {
				synopsisBuilder.WriteString("\n\n")
			}
			synopsisBuilder.WriteString(pTxt)
		}
	})

	likes := 0
	dislikes := 0
	videoID := 0

	doc.Find("astro-island").Each(func(i int, island *goquery.Selection) {
		opts := island.AttrOr("opts", "")
		if strings.Contains(opts, "VideoLikeDislikeControls") {
			props := island.AttrOr("props", "")
			if strings.Contains(props, "video_id") {
				parts := strings.Split(props, ",")
				for _, part := range parts {
					if strings.Contains(part, "video_id") {
						vParts := strings.Split(part, ":")
						if len(vParts) >= 2 {
							numStr := strings.Trim(vParts[len(vParts)-1], "[]}\" ")
							videoID, _ = strconv.Atoi(numStr)
						}
					} else if strings.Contains(part, "likes") {
						vParts := strings.Split(part, ":")
						if len(vParts) >= 2 {
							numStr := strings.Trim(vParts[len(vParts)-1], "[]}\" ")
							likes, _ = strconv.Atoi(numStr)
						}
					} else if strings.Contains(part, "dislikes") {
						vParts := strings.Split(part, ":")
						if len(vParts) >= 2 {
							numStr := strings.Trim(vParts[len(vParts)-1], "[]}\" ")
							dislikes, _ = strconv.Atoi(numStr)
						}
					}
				}
			}
		}
	})

	return VideoDetail{
		ID:         videoID,
		Title:      title,
		Slug:       slug,
		PageURL:    targetURL,
		CoverURL:   coverURL,
		Brand:      brand,
		BrandURL:   brandURL,
		Uploads:    uploads,
		ReleasedAt: releasedAt,
		UploadedAt: uploadedAt,
		Likes:      likes,
		Dislikes:   dislikes,
		Genres:     genres,
		Synopsis:   synopsisBuilder.String(),
	}
}

func ScrapeVideoStream(targetSlugOrURL string) ScrapeResult {
	startTime := time.Now().UnixMilli()

	slug := strings.TrimSpace(targetSlugOrURL)
	if strings.Contains(slug, "/videos/hentai/") {
		parts := strings.Split(slug, "/videos/hentai/")
		if len(parts) > 1 {
			slug = strings.Trim(parts[1], "/")
		}
	} else if strings.HasPrefix(slug, "http://") || strings.HasPrefix(slug, "https://") {
		parts := strings.Split(slug, "/")
		slug = parts[len(parts)-1]
	}

	targetURL := fmt.Sprintf("https://hanime.tv/videos/hentai/%s", slug)

	allocOpts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", "new"),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-setuid-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("disable-blink-features", "AutomationControlled"),
		chromedp.UserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"),
	)

	allocCtx, allocCancel := chromedp.NewExecAllocator(context.Background(), allocOpts...)
	defer allocCancel()

	ctx, cancel := chromedp.NewContext(allocCtx)
	defer cancel()

	ctx, timeoutCancel := context.WithTimeout(ctx, 35*time.Second)
	defer timeoutCancel()

	tokenChan := make(chan string, 1)

	chromedp.ListenTarget(ctx, func(ev any) {
		if respEv, ok := ev.(*network.EventResponseReceived); ok {
			if strings.Contains(respEv.Response.URL, "/api/v11/handshake") {
				for k, v := range respEv.Response.Headers {
					if strings.EqualFold(k, "x-token") {
						if strVal, ok := v.(string); ok && strVal != "" {
							select {
							case tokenChan <- strVal:
							default:
							}
						}
					}
				}
			}
		}
	})

	var htmlContent string
	err := chromedp.Run(ctx,
		network.Enable(),
		chromedp.Navigate(targetURL),
		chromedp.OuterHTML("html", &htmlContent),
	)
	if err != nil {
		return ScrapeResult{Success: false, Mode: "video", Error: err.Error(), Timestamp: startTime}
	}

	var rawToken string
	select {
	case rawToken = <-tokenChan:
	case <-ctx.Done():
		return ScrapeResult{Success: false, Mode: "video", Error: "handshake_timeout", Timestamp: startTime}
	}

	decrypted, err := decryptHandshakeToken(rawToken)
	if err != nil {
		return ScrapeResult{Success: false, Mode: "video", Error: "decrypt_failed: " + err.Error(), Timestamp: startTime}
	}

	streams := make([]StreamSource, 0)
	for _, src := range decrypted.Sources {
		if src.Src == "" || src.Kind == "promotion" {
			continue
		}
		streamURL := src.Src
		if strings.HasPrefix(streamURL, "/") {
			streamURL = "https://hanime.tv" + streamURL
		}
		streams = append(streams, StreamSource{
			Quality: src.Label,
			Width:   src.Width,
			Height:  src.Height,
			Type:    src.Type,
			URL:     streamURL,
		})
	}

	detail := parseVideoMetadata(htmlContent, slug, targetURL)
	detail.Streams = streams

	return ScrapeResult{
		Success:   true,
		Mode:      "video",
		Data:      detail,
		Timestamp: startTime,
	}
}

func main() {
	videoSlug := flag.String("video", "", "Video slug or full URL")
	homeMode := flag.Bool("home", false, "Scrape homepage categories")
	trendingMode := flag.Bool("trending", false, "Scrape trending videos")
	trendingTime := flag.String("time", "monthly", "Trending timespan: daily, weekly, monthly, all")
	searchQuery := flag.String("search", "", "Search by keyword")
	tagFilter := flag.String("tag", "", "Filter by genre/tag")
	brandFilter := flag.String("brand", "", "Filter by studio/brand")
	sortBy := flag.String("sort", "", "Sort order: popular/views, likes, released, recent")
	page := flag.Int("page", 1, "Page number")
	limit := flag.Int("limit", 24, "Results limit per page")

	flag.Parse()

	var result ScrapeResult

	if *videoSlug != "" {
		result = ScrapeVideoStream(*videoSlug)
	} else if *trendingMode {
		result = ScrapeTrending(*page, *trendingTime)
	} else if *searchQuery != "" || *tagFilter != "" || *brandFilter != "" || *sortBy != "" {
		result = QueryCatalog(*searchQuery, *tagFilter, *brandFilter, *sortBy, *page, *limit)
	} else if flag.NArg() > 0 {
		arg := flag.Arg(0)
		if strings.Contains(arg, "/videos/hentai/") || (!strings.HasPrefix(arg, "http") && !strings.Contains(arg, " ")) {
			result = ScrapeVideoStream(arg)
		} else {
			result = QueryCatalog(arg, "", "", "popular", 1, 24)
		}
	} else if *homeMode || len(os.Args) == 1 {
		result = ScrapeHome()
	}

	output, _ := json.MarshalIndent(result, "", "  ")
	fmt.Println(string(output))

	if !result.Success {
		os.Exit(1)
	}
}
