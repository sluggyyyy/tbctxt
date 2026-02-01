# TBC.TXT API

A Go REST API that serves TBC (The Burning Crusade) PvE data for use in other applications.

## Quick Start

```bash
cd api
go run main.go
```

Server starts on `http://localhost:8080` (or set `PORT` env var)

## Build

```bash
go build -o tbc-api .
./tbc-api
```

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and data counts.

### Classes

```
GET /api/classes                    # List all classes with specs
GET /api/classes/{class}            # Full class data (warrior, paladin, hunter, etc.)
GET /api/classes/{class}/{spec}     # Specific spec data (arms, fury, protection, etc.)
```

**Example:**
```bash
curl http://localhost:8080/api/classes/warrior
curl http://localhost:8080/api/classes/warrior/fury
```

**Response includes:**
- Rotation priority and cooldowns
- Talent builds with point distributions
- BiS gear for all phases (PreRaid, Phase 1-5)
- Recommended enchants and gems

### Items

```
GET /api/items                      # Item count and usage info
GET /api/items/search?q={query}     # Search items by name (max 50 results)
GET /api/items/{name}               # Get item ID by exact or partial name
```

**Example:**
```bash
curl "http://localhost:8080/api/items/search?q=thunderfury"
curl http://localhost:8080/api/items/warglaive
```

### Raids

```
GET /api/raids                      # All raid data by phase
GET /api/raids/{phase}              # Specific phase (1, 2, 3, 4, 5 or phase1, phase2, etc.)
GET /api/raids/{phase}/{raid}       # Specific raid (karazhan, gruuls_lair, etc.)
```

**Example:**
```bash
curl http://localhost:8080/api/raids/1
curl http://localhost:8080/api/raids/phase2/serpentshrine_cavern
```

**Response includes:**
- Raid info (size, location, attunement)
- All bosses with abilities and spell IDs
- Strategy guides

### Recipes

```
GET /api/recipes                    # List all professions
GET /api/recipes/{profession}       # Specific profession data
```

**Professions:** blacksmithing, leatherworking, tailoring, jewelcrafting, engineering, alchemy, enchanting

**Example:**
```bash
curl http://localhost:8080/api/recipes/blacksmithing
```

### Reference Data

```
GET /api/reference                  # All reference data
GET /api/reference/enchants         # Enchant name -> spell ID mappings
GET /api/reference/talents          # Talent name -> spell ID mappings
GET /api/reference/quests           # Quest name -> quest ID mappings
```

## CORS

All endpoints support CORS (Access-Control-Allow-Origin: *) for browser usage.

## Data Source

Data is loaded from JSON files in the `../data/` directory:
- `classData.json` - Class/spec information
- `itemIds.json` - Item name to ID mappings
- `raidsData.json` - Raid and boss data
- `recipesData.json` - Profession recipes
- `referenceData.json` - Enchants, talents, quests

## Example Usage

### JavaScript/Fetch
```javascript
// Get fury warrior BiS
const response = await fetch('http://localhost:8080/api/classes/warrior/fury');
const furyData = await response.json();
console.log(furyData.phases[1].bis); // Phase 1 BiS list

// Search for items
const items = await fetch('http://localhost:8080/api/items/search?q=dragonspine');
const results = await items.json();
```

### Python
```python
import requests

# Get all raid data
raids = requests.get('http://localhost:8080/api/raids').json()

# Get Karazhan bosses
kara = requests.get('http://localhost:8080/api/raids/1/karazhan').json()
for boss in kara['bosses']:
    print(f"{boss['name']}: {len(boss['abilities'])} abilities")
```

## License

Data sourced from TBC.TXT community project.
