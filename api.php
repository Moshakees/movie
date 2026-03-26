<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * Akoam External API Proxy (v4.0)
 * Purpose: Serves as external data source for Kira Movie (Vercel)
 * Endpoints: featured, latest, search, details, category_content, categories
 */

class AkoamAPI {
    private $baseUrl = 'https://ak.sv';
    private $context;
    private $timeout = 15;

    public function __construct() {
        $this->context = stream_context_create([
            "http" => [
                "header" => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36\r\n",
                "timeout" => $this->timeout,
                "follow_location" => 1,
                "max_redirects" => 5
            ],
            "ssl" => [
                "verify_peer" => false,
                "verify_peer_name" => false,
            ]
        ]);
    }

    public function cleanText($text) {
        $text = strip_tags($text);
        $text = preg_replace('/مشاهدة و تحميل (فيلم|مسلسل) [^ ]+ حيث يدور العمل حول/', '', $text);
        $text = preg_replace('/مشاهدة و تحميل (فيلم|مسلسل) [^ ]+ يدور العمل حول/', '', $text);
        $text = preg_replace('/يدور العمل حول/', '', $text, 1);
        $text = str_replace(["\r", "\n", "\t", "&nbsp;"], " ", $text);
        $text = preg_replace('/\s+/', ' ', $text);
        return trim($text);
    }

    public function cleanOutputUrl($url) {
        return str_replace('\\', '', $url);
    }

    private function encodeUrl($url) {
        $url = str_replace('\\', '', $url);
        if (preg_match('/[^\x00-\x7F]/', $url)) {
            $parts = parse_url($url);
            $encodedUrl = (isset($parts['scheme']) ? $parts['scheme'] . '://' : 'https://') . (isset($parts['host']) ? $parts['host'] : 'ak.sv');
            if (isset($parts['path'])) {
                $pathParts = explode('/', $parts['path']);
                $encodedPath = array_map(function($part) {
                    return preg_match('/[^\x00-\x7F]/', $part) ? urlencode($part) : $part;
                }, $pathParts);
                $encodedUrl .= implode('/', $encodedPath);
            }
            if (isset($parts['query'])) $encodedUrl .= '?' . $parts['query'];
            return $encodedUrl;
        }
        return $url;
    }

    private function request($url) {
        $cleanUrl = $this->encodeUrl($url);
        $html = @file_get_contents($cleanUrl, false, $this->context);
        return ($html === false) ? null : $html;
    }

    public function getFeatured() {
        $html = $this->request($this->baseUrl . '/main');
        if (!$html) return ['error' => 'Could not fetch home page', 'status' => 'failed'];

        $results = [];
        if (preg_match('/المميزة.*?<div class="widget-body"[^>]*>(.*?)<header/s', $html, $section)) {
            $content = $section[1];
            preg_match_all('/<div class="entry-box[^>]*>(.*?)<\/h3>/s', $content, $blocks);
            foreach ($blocks[1] as $block) {
                if (preg_match('/href="(https:\/\/ak\.sv\/(movie|series|show|mix)\/.*?)"/', $block, $m)) {
                    $link = $m[1];
                    $type = $m[2];
                    $image = preg_match('/data-src="(.*?)"/', $block, $img) ? $img[1] : (preg_match('/<img src="(.*?)"/', $block, $img) ? $img[1] : '');
                    $title = preg_match('/class="text-white">(.*?)<\/a>/', $block, $t) ? $this->cleanText($t[1]) : '';
                    if ($link && $title) {
                        $results[] = ['title' => $title, 'url' => $this->cleanOutputUrl($link), 'type' => $type, 'poster' => $image];
                    }
                }
            }
        }
        return ['count' => count($results), 'results' => $results, 'status' => 'success'];
    }

    public function getLatestHome() {
        $html = $this->request($this->baseUrl . '/main');
        if (!$html) return ['error' => 'Could not fetch home page', 'status' => 'failed'];

        $sections = [];
        preg_match_all('/<h2 class="header-title[^>]*>(.*?)<\/h2>.*?<div class="row">(.*?)<\/div>/s', $html, $matches);
        for ($i = 0; $i < count($matches[1]); $i++) {
            $sectionTitle = $this->cleanText($matches[1][$i]);
            if (empty($sectionTitle) || $sectionTitle == "المميزة") continue;
            $items = $this->parseList($matches[2][$i]);
            if (!empty($items)) {
                $sections[] = ['section_title' => $sectionTitle, 'items' => $items];
            }
        }
        return ['sections' => $sections, 'status' => 'success'];
    }

    public function getAllCategories() {
        $sections_to_fetch = [
            'movies' => ['url' => $this->baseUrl . '/movies', 'name' => 'الأفلام'],
            'series' => ['url' => $this->baseUrl . '/series', 'name' => 'المسلسلات'],
            'shows'  => ['url' => $this->baseUrl . '/shows',  'name' => 'تلفزيون'],
            'mix'    => ['url' => $this->baseUrl . '/mix',    'name' => 'منوعات']
        ];

        $all_data = [];
        foreach ($sections_to_fetch as $key => $info) {
            $html = $this->request($info['url']);
            if (!$html) continue;
            $section_data = ['display_name' => $info['name'], 'filters' => []];
            $filters_map = ['section' => 'الأقسام الفرعية', 'category' => 'التصنيفات', 'quality' => 'الجودة', 'language' => 'اللغة', 'year' => 'سنة الإنتاج'];
            foreach ($filters_map as $filter_name => $display_label) {
                if (preg_match('/<select[^>]*name="' . $filter_name . '"[^>]*>(.*?)<\/select>/s', $html, $m)) {
                    preg_match_all('/<option[^>]*value="([^"]+)"[^>]*>(.*?)<\/option>/s', $m[1], $options);
                    $items = [];
                    for ($j = 0; $j < count($options[1]); $j++) {
                        $id = $options[1][$j];
                        $title = $this->cleanText($options[2][$j]);
                        if ($id !== "0" && !empty($title)) $items[] = ['id' => $id, 'name' => $title];
                    }
                    if (!empty($items)) $section_data['filters'][$filter_name] = ['label' => $display_label, 'items' => $items];
                }
            }
            $all_data[$key] = $section_data;
        }
        return $all_data;
    }

    public function getCategoryContent($type, $filters = []) {
        $page = isset($filters['page']) ? $filters['page'] : 1;
        unset($filters['page']);

        $baseUrl = $this->baseUrl . '/' . $type;
        $filters['page'] = $page;
        $query = http_build_query($filters);
        $url = $baseUrl . '?' . $query;

        $html = $this->request($url);
        if (!$html) return ['type' => $type, 'count' => 0, 'results' => [], 'status' => 'success'];

        $results = $this->parseList($html);
        return ['type' => $type, 'count' => count($results), 'results' => $results, 'status' => 'success'];
    }

    private function parseList($html) {
        $results = [];
        preg_match_all('/<div class="entry-image">(.*?)<\/h3>/s', $html, $blocks);
        foreach ($blocks[1] as $block) {
            if (preg_match('/href="(https:\/\/ak\.sv\/(movie|series|show|mix|episode)\/.*?)"/', $block, $m)) {
                $link = $m[1];
                $type = $m[2];
                $image = preg_match('/xlink:href="(.*?)"/', $block, $img) ? $img[1] : (preg_match('/<img src="(.*?)"/', $block, $img) ? $img[1] : '');
                $title = preg_match('/alt="(.*?)"/', $block, $t) ? $this->cleanText($t[1]) : '';
                if ($link && $title) {
                    $results[] = ['title' => $title, 'url' => $this->cleanOutputUrl($link), 'type' => $type, 'poster' => $image];
                }
            }
        }
        return $results;
    }

    public function search($query) {
        $url = $this->baseUrl . '/search?q=' . urlencode($query);
        $html = $this->request($url);
        if (!$html) return ['error' => 'Could not connect to Akoam', 'status' => 'failed'];
        $results = $this->parseList($html);
        return ['query' => $query, 'count' => count($results), 'results' => $results, 'status' => 'success'];
    }

    public function getDetails($url) {
        $html = $this->request($url);
        if (!$html) return ['error' => 'Could not fetch details', 'status' => 'failed', 'url' => $url];

        $data = ['url' => $this->cleanOutputUrl($url), 'success' => true, 'status' => 'success', 'story' => 'غير متوفر'];
        if (preg_match('/<h1[^>]*>(.*?)<\/h1>/s', $html, $m)) $data['title'] = $this->cleanText($m[1]);
        if (preg_match('/xlink:href="(.*?)"/', $html, $m)) $data['poster'] = $m[1];

        $isEpisode = (strpos($url, '/episode/') !== false);
        $mainPageHtml = $html;
        if ($isEpisode) {
            if (preg_match('/href="(https:\/\/ak\.sv\/(series|show)\/.*?)"/', $html, $m)) {
                $seriesUrl = $m[1];
                $data['parent_url'] = $this->cleanOutputUrl($seriesUrl);
                $seriesHtml = $this->request($seriesUrl);
                if ($seriesHtml) $mainPageHtml = $seriesHtml;
            }
        }

        if (preg_match('/<meta name="description" content="(.*?)"/s', $mainPageHtml, $m)) $data['story'] = $this->cleanText($m[1]);
        if ($data['story'] == 'غير متوفر' || strlen($data['story']) < 10) {
            if (preg_match('/<div class="story"[^>]*>(.*?)<\/div>/s', $mainPageHtml, $m)) $data['story'] = $this->cleanText($m[1]);
            elseif (preg_match('/<p class="text-white[^>]*>(.*?)<\/p>/s', $mainPageHtml, $m)) $data['story'] = $this->cleanText($m[1]);
        }

        $metadata = [];
        $metadata_items = [];
        preg_match_all('/<div class="font-size-16 text-white[^>]*>(.*?)<\/div>/s', $html, $m);
        foreach ($m[1] as $item) {
            $cleanItem = $this->cleanText($item);
            if (strpos($cleanItem, ':') !== false) {
                $parts = explode(':', $cleanItem, 2);
                $key = trim($parts[0]); $val = trim($parts[1]);
                if (!empty($key) && !empty($val)) $metadata[$key] = $val;
            } elseif (preg_match('/(\d+\s*\/\s*\d+)/', $cleanItem, $rating)) {
                $metadata['التقييم'] = $rating[1];
            } elseif (!empty($cleanItem)) {
                $metadata_items[] = $cleanItem;
            }
        }
        $data['metadata'] = $metadata;
        if (!empty($metadata_items)) $data['metadata_items'] = $metadata_items;

        if (strpos($url, '/series/') !== false || strpos($url, '/show/') !== false || $isEpisode) {
            $data['type'] = (strpos($url, '/series/') !== false || (isset($seriesUrl) && strpos($seriesUrl, '/series/') !== false)) ? 'series' : 'show';
            $data['episodes'] = $this->extractAllEpisodes($mainPageHtml);
            $data['episode_count'] = count($data['episodes']);
            if ($isEpisode) $data['download_links'] = $this->getDownloadLinks($html);
        } else {
            $data['type'] = (strpos($url, '/movie/') !== false) ? 'movie' : 'mix';
            $data['download_links'] = $this->getDownloadLinks($html);
        }
        return $data;
    }

    private function extractAllEpisodes($html) {
        $episodes = []; $seenUrls = [];
        preg_match_all('/<a[^>]*href="(https:\/\/ak\.sv\/episode\/[^"]+)"[^>]*>(.*?)<\/a>/s', $html, $matches);
        for ($i = 0; $i < count($matches[1]); $i++) {
            $epUrl = $matches[1][$i]; $epTitle = $this->cleanText($matches[2][$i]);
            if (empty($epTitle) || strpos($matches[0][$i], '<img') !== false) continue;
            if (!in_array($epUrl, $seenUrls)) {
                $seenUrls[] = $epUrl;
                $episodes[] = ['episode_title' => $epTitle, 'url' => $this->cleanOutputUrl($epUrl)];
            }
        }
        usort($episodes, function($a, $b) {
            preg_match('/(\d+)/', $a['episode_title'], $numA);
            preg_match('/(\d+)/', $b['episode_title'], $numB);
            return (isset($numA[1]) ? (int)$numA[1] : 0) - (isset($numB[1]) ? (int)$numB[1] : 0);
        });
        return $episodes;
    }

    private function getDownloadLinks($html) {
        $links = [];
        preg_match_all('/href="(http:\/\/go\.ak\.sv\/link\/\d+)"/', $html, $m);
        foreach (array_unique($m[1]) as $goUrl) {
            $direct = $this->resolveGoLink($goUrl);
            if ($direct) $links[] = $direct;
        }
        return $links;
    }

    private function resolveGoLink($goUrl) {
        $html = $this->request($goUrl);
        if ($html && preg_match('/href="(https:\/\/ak\.sv\/download\/.*?)"/', $html, $m)) {
            $dlHtml = $this->request($m[1]);
            if ($dlHtml && preg_match('/href="(https:\/\/[^"]+\.(mp4|mkv|avi|mov|flv|webm)[^"]*)"/i', $dlHtml, $dl)) {
                return [
                    'direct_url' => $this->cleanOutputUrl($dl[1]),
                    'quality' => $this->extractQuality($dl[1])
                ];
            }
        }
        return null;
    }

    private function extractQuality($url) {
        return preg_match('/(1080p|720p|480p|360p|240p|4k|hd|sd)/i', $url, $m) ? strtoupper($m[1]) : 'Unknown';
    }
}

// ─── Handle Request ─────────────────────────────────────────────────────────
$api = new AkoamAPI();
$action = isset($_GET['action']) ? $_GET['action'] : '';
$json_flags = JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES;

switch ($action) {
    case 'featured':
        echo json_encode($api->getFeatured(), $json_flags);
        break;

    case 'latest':
        echo json_encode($api->getLatestHome(), $json_flags);
        break;

    case 'categories':
        echo json_encode(['status' => 'success', 'data' => $api->getAllCategories()], $json_flags);
        break;

    case 'category_content':
        $type = $_GET['type'] ?? 'movies';
        $filters = [];
        foreach (['section', 'category', 'quality', 'language', 'year', 'page'] as $f) {
            if (isset($_GET[$f])) $filters[$f] = $_GET[$f];
        }
        echo json_encode($api->getCategoryContent($type, $filters), $json_flags);
        break;

    case 'search':
        echo json_encode($api->search($_GET['q'] ?? ''), $json_flags);
        break;

    case 'details':
        echo json_encode($api->getDetails($_GET['url'] ?? ''), $json_flags);
        break;

    default:
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
        $full_url = "$protocol://$_SERVER[HTTP_HOST]$_SERVER[SCRIPT_NAME]";
        echo json_encode([
            'status' => 'online',
            'api_name' => 'Kira Movie API',
            'version' => '4.0',
            'endpoints' => [
                ['action' => 'featured',         'example' => "$full_url?action=featured"],
                ['action' => 'latest',           'example' => "$full_url?action=latest"],
                ['action' => 'search',           'example' => "$full_url?action=search&q=query"],
                ['action' => 'details',          'example' => "$full_url?action=details&url=URL"],
                ['action' => 'category_content', 'example' => "$full_url?action=category_content&type=movies"],
                ['action' => 'categories',       'example' => "$full_url?action=categories"],
            ]
        ], $json_flags);
        break;
}
?>
