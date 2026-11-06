# Care Theory board game

A 24-tile board game. The host shows the board on a projector; players and tandems join on their phones with a 4-letter code, enter their physical dice roll, and answer each tile out loud.

- `public/host.html` — projector screen (creates a room, shows QR code, runs the game)
- `public/play.html` — phone screen
- `public/index.html` — "enter a code" page for phones
- `public/js/tiles.js` — the 24 tiles and game settings
- `public/js/game.js` — the rules

## Test locally

```bash
python3 -m http.server 8080 --directory public
```

Open `http://localhost:8080/host.html`, then open `play.html?room=CODE` in other tabs of the same browser. With no Firebase config the game runs in local test mode, which only syncs between tabs.

## Live site

Live at https://care-theory.web.app — open `host.html` on the projector laptop; phones scan the QR code.

It lives in the `seth-acosta-portfolio` Firebase project as a second Hosting site (`care-theory`) and uses that project's Realtime Database. The portfolio site itself is separate and is never part of this deploy.

## Deploy

```bash
npm install
npx firebase deploy --only hosting:care-theory,database
```

Always keep `--only hosting:care-theory,database` so the portfolio site can't be touched.

The database rules let anyone with a 4-letter room code read and write that room, which is fine for a private game night but not for anything sensitive.
