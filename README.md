# School Programmes Ascention Manager

A local React web app for managing student participation in school arts, sports, science, and other competition categories.

## Run

```bash
npm install
npm run dev
```

The app stores data in the browser under `ascman-school-participation-db-v1` and ships with demo students, competition items, group members, participation records, and level results.

## Data Schema

- `Student`: name, admission number, class, division, gender, school name, contact details, photo data.
- `CompetitionItem`: item name, category, type, level.
- `Participation`: student, item, current level, stopped flag, level result map.
- `LevelResult`: position, grade/result, grace marks, remarks, date.
- `GroupMember`: group item and student membership.
- `UploadedPhoto`: reserved photo upload records; current photo data is stored with each student for offline use.

## Import / Export

Settings includes CSV import and export for Excel-compatible student participation lists. Required import columns are `Student Name` and `Item`; optional columns include `Admission No`, `Class`, `Division`, `Category`, `Type`, and `Current Level`.
