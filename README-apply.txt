Lazy Acres Suite corrected files — Today layout/weather/calendar owner update

Drop these files into the repository at the same paths shown in this ZIP.

Files included:
- index.html
- assets/app-shell/dashboard-data-live.js
- assets/app-shell/today-desktop-pass.js
- assets/app-shell/today-desktop-pass.css

What changed:
1. Weather can use the middle/available desktop space and shows a Northern Michigan radar iframe on screens 980px and wider.
2. Calendar stays a single-width card.
3. Shopping keeps its current-width card and the quick-add field is decoupled from opening the shopping app.
4. Calendar events try to append the owner/person name after the event title: time + title + owner.
5. Dashboard live-data import is cache-routed through index.html so the existing app.js internal v0.1.46 import resolves to dashboard-data-live.js?v=0.1.48.

Note:
The owner-name code looks for common columns such as owner_name, owner, person_name, person, assigned_to, profile_name, profile, calendar_owner, preset_owner, user_name, user, and who. If the Scheduler table uses a different column, tell me the column name and I will adjust it.
