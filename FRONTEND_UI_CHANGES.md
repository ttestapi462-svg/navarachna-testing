# Frontend UI updates

Updated the Expenses page in both web and mobile apps according to the supplied reference screenshots.

- Removed the “Atelier operations” eyebrow text and subtitle below “Expense management”; reduced the page title size.
- Removed the Expenses found, Visible spend, and Showing records summary cards.
- Removed the Add expense call-to-action from the empty state inside Expense records. The Add expense action beside Refresh remains.
- Replaced the date-filter control with a date-range calendar containing quick presets (Today, Yesterday, Last 7 days, Last 30 days, Month to date, Last month, Year to date, Last year), a selectable month grid, and range apply/clear actions.
- Added a custom calendar picker for the Expense date field in the add/edit form. Expense dates remain date-only because the API model accepts a date, not a time.
- Kept the expense table/card records connected to the existing expenses API, search, date filtering, pagination, receipt actions, and add/edit/delete flows.
- Updated desktop loading rows to use per-column skeletons, keeping the table structure visible while records load.

Validation: TypeScript/TSX syntax transpilation passed for the two edited screen files. A full application build and live API test were not run in this environment.
