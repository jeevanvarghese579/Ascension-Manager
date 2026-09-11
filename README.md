# School Programmes Ascention Manager

A React web app for managing student participation in school arts, sports, science, and other competition categories.

## Run

```bash
npm install
npm run dev
```

At startup, the user chooses one of two workspaces:

- **Continue with Google** authenticates with Firebase Authentication and stores that user's records in Firestore under `ascensionManagerUsers/{uid}`.
- **Work locally offline** stores records in IndexedDB on the current browser and device. Existing `localStorage` data under `ascman-school-participation-db-v1` is migrated automatically the first time local mode is opened.

Both modes ship with demo students, competition items, group members, participation records, and level results when a workspace is first created.

## Firebase setup

1. Enable Google in Firebase Console → Authentication → Sign-in method.
2. Add every deployed or development hostname to Authentication → Settings → Authorized domains.
3. Merge the `ascensionManagerUsers` rule block from `firestore.ascension-manager.rules` into the shared project's current Firestore rules. The Firebase project hosts multiple apps, so do not deploy that example file by itself and replace their rules.

## Data Schema

- `Student`: name, admission number, class, division, gender, school name, contact details, photo data.
- `CompetitionItem`: item name, category, type, level.
- `Participation`: student, item, current level, stopped flag, level result map.
- `LevelResult`: position, grade/result, grace marks, remarks, date.
- `GroupMember`: group item and student membership.
- `UploadedPhoto`: reserved photo upload records; current photo data is stored with each student for offline use.

## Import / Export

Settings includes CSV import and export for Excel-compatible student participation lists. Required import columns are `Student Name` and `Item`; optional columns include `Admission No`, `Class`, `Division`, `Category`, `Type`, and `Current Level`.
