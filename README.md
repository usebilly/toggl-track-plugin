# Toggl Track Importer for [Billy](https://usebilly.app)

A [Billy](https://usebilly.app) plugin that turns a [Toggl Track](https://toggl.com/track/) CSV export into invoices—one invoice per client, with your tracked time rolled up into line items.

## What it Does

- **One invoice per client.** Entries are grouped by Toggl’s `Client` column, so a single export covering several clients produces a separate invoice for each.
- **One line item per project.** Within each client, entries are grouped by `Project`; their durations are summed into a single `Hour` line item.
- **Billable only.** Entries marked `Billable: No` are left out.
- **Durations parsed from timecodes.** Toggl’s `H:MM:SS` durations are converted to decimal hours.
- **‌Unit price from your rate.** Each line item uses the `Hourly rate` from the export if present.
- **Currency from the export.** The invoice currency is set from Toggl’s `Currency` column.
- **VAT from your profile.** Toggl carries no VAT, so line items use your profile’s default VAT rate.
- **Service period.** Each invoice’s service dates span the earliest and latest date in the export for that client.

Invoice number, sender details, and payment terms come from your active Billy profile—exactly as if you’d hit **New Invoice**.

## Install

1. In Billy, open **Settings → Plugins**.
2. Click **Add Plugin…** and select the `Toggl Track Import.billyplugin` folder—or just drag it onto the list.

## Use

1. In Toggl Track’s web panel, open **Reports → Detailed** and export the entries you want to bill as a **CSV**.
2. In Billy, choose **Profiles → Import Invoices… → Toggl Track Import**.
3. Pick one or more CSV files. Billy creates the invoices as drafts for you to review.

## CSV Format

The plugin reads Toggl Track’s report CSV. Only `Project` and `Duration` are required—every other column is used when present and ignored when missing:

| Column        | Required | Used for                                              |
| ------------- | -------- | ----------------------------------------------------- |
| `Project`     | yes      | Line item description; groups line items              |
| `Duration`    | yes      | Hours (line item quantity), parsed from `H:MM:SS`     |
| `Client`      | no       | Client name (recipient); groups invoices              |
| `Billable`    | no       | Filters out `No` rows (unless a client has none `Yes`) |
| `Hourly rate` | no       | Unit price (preferred when present)                   |
| `Amount (…)`  | no       | Derives the unit price when no `Hourly rate` is given |
| `Currency`    | no       | Invoice currency                                      |
| `Start date`  | no       | Start of the service period                           |
| `Stop date`   | no       | End of the service period                             |

## Building / Contributing

This folder is also a worked example for the Billy [plugin specification](https://usebilly.app/support/plugin-spec)—see the spec for the full plugin API, and [`main.js`](./main.js) / [`helpers.js`](./helpers.js) for the implementation.
