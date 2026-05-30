/**
 * Parse a delimited CSV string into an array of plain objects keyed by the
 * header row.
 *
 * Handles:
 *  - A leading UTF-8 BOM (present in Toggl exports)
 *  - Comma or semicolon delimiter (auto-detected from the header row)
 *  - Optional double-quoted fields (strips surrounding quotes)
 *  - Skips blank lines
 */
exports.parseCSV = function(text) {
	// Toggl exports start with a UTF-8 BOM; strip it so the first header is clean.
	if (text.charCodeAt(0) === 0xFEFF) {
		text = text.slice(1);
	}

	var lines = text.split(/\r?\n/);
	var delimiter = detectDelimiter(lines[0]);

	var headers = splitLine(lines[0], delimiter);
	var rows = [];

	for (var i = 1; i < lines.length; i++) {
		var line = lines[i].trim();
		if (!line) continue;

		var values = splitLine(line, delimiter);
		var row = {};
		headers.forEach(function(header, index) {
			row[header.trim()] = (values[index] || '').trim();
		});
		rows.push(row);
	}

	return rows;
};

/**
 * Convert a Toggl duration into decimal hours.
 *
 * Toggl exports durations as a timecode ("H:MM:SS", or "MM:SS"), which is read
 * left to right in base 60. A plain number is returned as-is, in case the
 * export uses the decimal duration format instead.
 */
exports.durationToHours = function(value) {
	var parts = String(value).split(':');
	if (parts.length === 1) {
		return parseFloat(value) || 0;
	}

	var seconds = parts.reduce(function(total, part) {
		return total * 60 + (parseInt(part, 10) || 0);
	}, 0);
	return seconds / 3600;
};

/**
 * Round to 2 decimal places to avoid floating-point noise
 * (e.g. 2.9999999 → 3.00).
 */
exports.round2 = function(value) {
	return Math.round(value * 100) / 100;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Picks whichever of , or ; appears more often in the header row, defaulting
// to , (Toggl's default) when neither is present.
function detectDelimiter(headerLine) {
	var semicolons = (headerLine.match(/;/g) || []).length;
	var commas = (headerLine.match(/,/g) || []).length;
	return semicolons > commas ? ';' : ',';
}

function splitLine(line, delimiter) {
	var fields = [];
	var current = '';
	var inQuotes = false;

	for (var i = 0; i < line.length; i++) {
		var ch = line[i];

		if (ch === '"') {
			inQuotes = !inQuotes;
		} else if (ch === delimiter && !inQuotes) {
			fields.push(current);
			current = '';
		} else {
			current += ch;
		}
	}
	fields.push(current);
	return fields;
}
