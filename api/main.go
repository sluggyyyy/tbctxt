package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// Data structures
var (
	classData     map[string]interface{}
	itemIds       map[string]interface{}
	raidsData     map[string]interface{}
	recipesData   map[string]interface{}
	referenceData map[string]interface{}
)

func main() {
	// Load all JSON data
	if err := loadData(); err != nil {
		log.Fatalf("Failed to load data: %v", err)
	}

	// Setup routes
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /api/health", handleHealth)

	// Class endpoints
	mux.HandleFunc("GET /api/classes", handleClasses)
	mux.HandleFunc("GET /api/classes/{class}", handleClassByName)
	mux.HandleFunc("GET /api/classes/{class}/{spec}", handleSpec)

	// Item endpoints
	mux.HandleFunc("GET /api/items", handleItems)
	mux.HandleFunc("GET /api/items/search", handleItemSearch)
	mux.HandleFunc("GET /api/items/{name}", handleItemByName)

	// Raid endpoints
	mux.HandleFunc("GET /api/raids", handleRaids)
	mux.HandleFunc("GET /api/raids/{phase}", handleRaidPhase)
	mux.HandleFunc("GET /api/raids/{phase}/{raid}", handleRaidByName)

	// Recipe endpoints
	mux.HandleFunc("GET /api/recipes", handleRecipes)
	mux.HandleFunc("GET /api/recipes/{profession}", handleProfession)

	// Reference data endpoints
	mux.HandleFunc("GET /api/reference", handleReference)
	mux.HandleFunc("GET /api/reference/enchants", handleEnchants)
	mux.HandleFunc("GET /api/reference/talents", handleTalents)
	mux.HandleFunc("GET /api/reference/quests", handleQuests)

	// Wrap with CORS middleware
	handler := corsMiddleware(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf(`
╔════════════════════════════════════════════════════════════╗
║              TBC.TXT API Server                            ║
╠════════════════════════════════════════════════════════════╣
║  Server running on http://localhost:%s                   ║
║                                                            ║
║  Endpoints:                                                ║
║    GET /api/health              - Health check             ║
║    GET /api/classes             - All class data           ║
║    GET /api/classes/{class}     - Specific class           ║
║    GET /api/classes/{class}/{spec} - Specific spec         ║
║    GET /api/items               - All item IDs             ║
║    GET /api/items/search?q=     - Search items by name     ║
║    GET /api/items/{name}        - Get item ID by name      ║
║    GET /api/raids               - All raid data            ║
║    GET /api/raids/{phase}       - Raids by phase           ║
║    GET /api/recipes             - All profession recipes   ║
║    GET /api/recipes/{profession}- Specific profession      ║
║    GET /api/reference           - All reference data       ║
║    GET /api/reference/enchants  - Enchant spell IDs        ║
║    GET /api/reference/talents   - Talent spell IDs         ║
║    GET /api/reference/quests    - Quest IDs                ║
╚════════════════════════════════════════════════════════════╝
`, port)

	log.Fatal(http.ListenAndServe(":"+port, handler))
}

func loadData() error {
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "../data"
	}

	// Load classData
	if err := loadJSON(filepath.Join(dataDir, "classData.json"), &classData); err != nil {
		return fmt.Errorf("loading classData: %w", err)
	}
	log.Printf("Loaded %d classes", len(classData))

	// Load itemIds
	if err := loadJSON(filepath.Join(dataDir, "itemIds.json"), &itemIds); err != nil {
		return fmt.Errorf("loading itemIds: %w", err)
	}
	log.Printf("Loaded %d items", len(itemIds))

	// Load raidsData
	if err := loadJSON(filepath.Join(dataDir, "raidsData.json"), &raidsData); err != nil {
		return fmt.Errorf("loading raidsData: %w", err)
	}
	log.Printf("Loaded %d raid phases", len(raidsData))

	// Load recipesData
	if err := loadJSON(filepath.Join(dataDir, "recipesData.json"), &recipesData); err != nil {
		return fmt.Errorf("loading recipesData: %w", err)
	}
	log.Printf("Loaded %d professions", len(recipesData))

	// Load referenceData
	if err := loadJSON(filepath.Join(dataDir, "referenceData.json"), &referenceData); err != nil {
		return fmt.Errorf("loading referenceData: %w", err)
	}
	log.Printf("Loaded reference data (enchants, talents, quests)")

	return nil
}

func loadJSON(path string, v interface{}) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func errorResponse(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// ===== HANDLERS =====

func handleHealth(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, map[string]interface{}{
		"status": "ok",
		"data": map[string]int{
			"classes":     len(classData),
			"items":       len(itemIds),
			"raidPhases":  len(raidsData),
			"professions": len(recipesData),
		},
	})
}

// Class handlers
func handleClasses(w http.ResponseWriter, r *http.Request) {
	// Return list of available classes with basic info
	classList := make(map[string]interface{})
	for className, data := range classData {
		if classMap, ok := data.(map[string]interface{}); ok {
			specs := []string{}
			if specsData, ok := classMap["specs"].(map[string]interface{}); ok {
				for specName := range specsData {
					specs = append(specs, specName)
				}
			}
			classList[className] = map[string]interface{}{
				"title":       classMap["title"],
				"defaultSpec": classMap["defaultSpec"],
				"specs":       specs,
			}
		}
	}
	jsonResponse(w, classList)
}

func handleClassByName(w http.ResponseWriter, r *http.Request) {
	className := strings.ToLower(r.PathValue("class"))

	if data, ok := classData[className]; ok {
		jsonResponse(w, data)
	} else {
		errorResponse(w, fmt.Sprintf("Class '%s' not found", className), http.StatusNotFound)
	}
}

func handleSpec(w http.ResponseWriter, r *http.Request) {
	className := strings.ToLower(r.PathValue("class"))
	specName := strings.ToLower(r.PathValue("spec"))

	classInfo, ok := classData[className]
	if !ok {
		errorResponse(w, fmt.Sprintf("Class '%s' not found", className), http.StatusNotFound)
		return
	}

	classMap, ok := classInfo.(map[string]interface{})
	if !ok {
		errorResponse(w, "Invalid class data", http.StatusInternalServerError)
		return
	}

	specs, ok := classMap["specs"].(map[string]interface{})
	if !ok {
		errorResponse(w, "No specs found for class", http.StatusNotFound)
		return
	}

	if specData, ok := specs[specName]; ok {
		jsonResponse(w, specData)
	} else {
		errorResponse(w, fmt.Sprintf("Spec '%s' not found for class '%s'", specName, className), http.StatusNotFound)
	}
}

// Item handlers
func handleItems(w http.ResponseWriter, r *http.Request) {
	// Return count and sample - full list is too large
	jsonResponse(w, map[string]interface{}{
		"total":   len(itemIds),
		"message": "Use /api/items/search?q=<name> to search or /api/items/<name> to get specific item",
	})
}

func handleItemSearch(w http.ResponseWriter, r *http.Request) {
	query := strings.ToLower(r.URL.Query().Get("q"))
	if query == "" {
		errorResponse(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	limit := 50 // Max results
	results := make(map[string]interface{})
	count := 0

	for name, id := range itemIds {
		if strings.Contains(strings.ToLower(name), query) {
			results[name] = id
			count++
			if count >= limit {
				break
			}
		}
	}

	jsonResponse(w, map[string]interface{}{
		"query":   query,
		"count":   len(results),
		"limited": count >= limit,
		"items":   results,
	})
}

func handleItemByName(w http.ResponseWriter, r *http.Request) {
	itemName := strings.ToLower(r.PathValue("name"))

	if id, ok := itemIds[itemName]; ok {
		jsonResponse(w, map[string]interface{}{
			"name":    itemName,
			"itemId":  id,
			"wowhead": fmt.Sprintf("https://tbc.wowhead.com/item=%.0f", id),
		})
	} else {
		// Try partial match
		for name, id := range itemIds {
			if strings.Contains(strings.ToLower(name), itemName) {
				jsonResponse(w, map[string]interface{}{
					"name":         name,
					"itemId":       id,
					"wowhead":      fmt.Sprintf("https://tbc.wowhead.com/item=%.0f", id),
					"partialMatch": true,
				})
				return
			}
		}
		errorResponse(w, fmt.Sprintf("Item '%s' not found", itemName), http.StatusNotFound)
	}
}

// Raid handlers
func handleRaids(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, raidsData)
}

func handleRaidPhase(w http.ResponseWriter, r *http.Request) {
	phase := strings.ToLower(r.PathValue("phase"))

	// Handle "phase1" or just "1"
	if !strings.HasPrefix(phase, "phase") {
		phase = "phase" + phase
	}

	if data, ok := raidsData[phase]; ok {
		jsonResponse(w, data)
	} else {
		errorResponse(w, fmt.Sprintf("Phase '%s' not found", phase), http.StatusNotFound)
	}
}

func handleRaidByName(w http.ResponseWriter, r *http.Request) {
	phase := strings.ToLower(r.PathValue("phase"))
	raidName := strings.ToLower(r.PathValue("raid"))

	if !strings.HasPrefix(phase, "phase") {
		phase = "phase" + phase
	}

	phaseData, ok := raidsData[phase]
	if !ok {
		errorResponse(w, fmt.Sprintf("Phase '%s' not found", phase), http.StatusNotFound)
		return
	}

	phaseMap, ok := phaseData.(map[string]interface{})
	if !ok {
		errorResponse(w, "Invalid phase data", http.StatusInternalServerError)
		return
	}

	raids, ok := phaseMap["raids"].(map[string]interface{})
	if !ok {
		errorResponse(w, "No raids found for phase", http.StatusNotFound)
		return
	}

	if raidData, ok := raids[raidName]; ok {
		jsonResponse(w, raidData)
	} else {
		errorResponse(w, fmt.Sprintf("Raid '%s' not found in phase '%s'", raidName, phase), http.StatusNotFound)
	}
}

// Recipe handlers
func handleRecipes(w http.ResponseWriter, r *http.Request) {
	// Return list of professions with basic info
	profList := make(map[string]interface{})
	for profName, data := range recipesData {
		if profMap, ok := data.(map[string]interface{}); ok {
			categories := []string{}
			if catsData, ok := profMap["categories"].(map[string]interface{}); ok {
				for catName := range catsData {
					categories = append(categories, catName)
				}
			}
			profList[profName] = map[string]interface{}{
				"title":      profMap["title"],
				"categories": categories,
			}
		}
	}
	jsonResponse(w, profList)
}

func handleProfession(w http.ResponseWriter, r *http.Request) {
	profession := strings.ToLower(r.PathValue("profession"))

	if data, ok := recipesData[profession]; ok {
		jsonResponse(w, data)
	} else {
		errorResponse(w, fmt.Sprintf("Profession '%s' not found", profession), http.StatusNotFound)
	}
}

// Reference handlers
func handleReference(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, referenceData)
}

func handleEnchants(w http.ResponseWriter, r *http.Request) {
	if data, ok := referenceData["enchantSpellIds"]; ok {
		jsonResponse(w, data)
	} else {
		errorResponse(w, "Enchant data not found", http.StatusNotFound)
	}
}

func handleTalents(w http.ResponseWriter, r *http.Request) {
	if data, ok := referenceData["talentSpellIds"]; ok {
		jsonResponse(w, data)
	} else {
		errorResponse(w, "Talent data not found", http.StatusNotFound)
	}
}

func handleQuests(w http.ResponseWriter, r *http.Request) {
	if data, ok := referenceData["questIds"]; ok {
		jsonResponse(w, data)
	} else {
		errorResponse(w, "Quest data not found", http.StatusNotFound)
	}
}
