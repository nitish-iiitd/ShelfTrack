# ShelfTrack

ShelfTrack is a clean offline-first product inventory web app built with Bootstrap 5 and browser IndexedDB.

## Features

- Add, edit, delete categories
- Add, edit, delete sub-categories
- Add, edit, delete products
- Toggle product status between `in_use` and `finished`
- Search inventory
- Export data as JSON
- Import data from JSON
- Delete all data with `delete-all` confirmation
- Local backup copy before import, restore, and delete-all
- Restore/export local backups
- Works without backend; data stays in the browser

## Run locally

Because this app uses ES modules, run it through a small local server instead of opening `index.html` directly.

### Option 1: Python

```bash
cd shelftrack
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
```

### Option 2: VS Code Live Server

Open the folder in VS Code and start Live Server.

## Storage

Main data is stored in IndexedDB in the browser:

- `categories`
- `sub_categories`
- `products`
- `backups`

## Import formats

ShelfTrack supports its own exported JSON format and also simple nested JSON like:

```json
{
  "makeup": {
    "lipsticks": {
      "loreal lips": { "status": "in_use" },
      "mabelline lipstick": { "status": "finished" }
    }
  }
}
```
