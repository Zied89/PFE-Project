# Fix Case-Sensitive Import for Coworking

## Problem
On Windows (case-sensitive filesystem), the import `./pages/CoWorking` fails to resolve because the actual file is `Coworking.jsx` (lowercase 'o'). macOS is case-insensitive so it works there.

## Steps
- [x] `src/App.js` — change `import Coworking from "./pages/CoWorking";` to `import Coworking from "./pages/Coworking";`
- [x] `src/App.jsx` — change `import Coworking from "./pages/CoWorking";` to `import Coworking from "./pages/Coworking";`
- [ ] Verify the fix by running `npm start` to confirm the app compiles successfully.
