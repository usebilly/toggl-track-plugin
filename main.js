var helpers = require('./helpers.js');

exports.importInvoices = function(fileContent, profile) {
	var rows = helpers.parseCSV(fileContent);

	if (rows.length === 0) {
		return [];
	}

	// Toggl has no VAT info, so use the profile's default VAT rate.
	var vatPercentage =
		profile && typeof profile.vatPercentage === 'number'
			? profile.vatPercentage
			: 0;

	// Used when a row has neither an hourly rate nor an amount to derive one from.
	var fallbackRate =
		profile && typeof profile.hourlyRate === 'number'
			? profile.hourlyRate
			: 0;

	// Toggl names the amount column after its currency, e.g. "Amount (USD)".
	var amountKey = findAmountKey(rows[0]);

	// Group rows by client (one invoice each). Project and Duration are the
	// only fields Toggl always exports.
	var clients = {};

	rows.forEach(function(row) {
		var project = field(row, 'Project');
		var hours = helpers.durationToHours(field(row, 'Duration'));
		if (!project || hours <= 0) return;

		var client = field(row, 'Client');
		if (!clients[client]) clients[client] = [];
		clients[client].push({ row: row, project: project, hours: hours });
	});

	return Object.keys(clients).sort().map(function(client) {
		var entries = clients[client];

		// Bill only billable entries — unless none are billable, then bill all.
		if (entries.some(isBillable)) {
			entries = entries.filter(isBillable);
		}

		return buildInvoice(client, entries, {
			amountKey: amountKey,
			fallbackRate: fallbackRate,
			vatPercentage: vatPercentage,
		});
	});
};

// Builds one invoice patch from a client's entries, grouping them by project
// (one line item each).
function buildInvoice(client, entries, options) {
	var projects = {};
	var dates = [];
	var currency = '';

	entries.forEach(function(entry) {
		var row = entry.row;

		if (!currency) currency = field(row, 'Currency');

		var start = field(row, 'Start date');
		var stop = field(row, 'Stop date');
		if (start) dates.push(start);
		if (stop) dates.push(stop);

		if (!projects[entry.project]) {
			projects[entry.project] = { hours: 0, amount: 0, rate: NaN };
		}
		var project = projects[entry.project];
		project.hours += entry.hours;

		var amount = options.amountKey ? parseFloat(field(row, options.amountKey)) : NaN;
		if (!isNaN(amount)) project.amount += amount;

		// Keep the first explicit hourly rate seen for the project.
		var rate = parseFloat(field(row, 'Hourly rate'));
		if (isNaN(project.rate) && !isNaN(rate)) project.rate = rate;
	});

	var items = Object.keys(projects).sort().map(function(name) {
		var project = projects[name];

		return {
			description: name,
			quantity: helpers.round2(project.hours),
			unit: 'Hour',
			unitPrice: resolveUnitPrice(project, options.fallbackRate),
			vatPercentage: options.vatPercentage,
		};
	});

	var patch = {
		recipient: { name: client },
		items: items,
	};

	if (currency) patch.currency = currency;

	// Only touch the service period when the export actually had dates.
	if (dates.length > 0) {
		dates.sort();
		patch.serviceDateStart = dates[0];

		var lastDate = dates[dates.length - 1];
		if (lastDate !== dates[0]) {
			patch.serviceDateEnd = lastDate;
		}
	}

	return patch;
}

// Prefer an explicit hourly rate; otherwise derive one from the amount;
// otherwise fall back to the profile's default hourly rate.
function resolveUnitPrice(project, fallbackRate) {
	if (!isNaN(project.rate)) {
		return project.rate;
	}
	if (project.amount > 0 && project.hours > 0) {
		return helpers.round2(project.amount / project.hours);
	}
	return fallbackRate;
}

function isBillable(entry) {
	return field(entry.row, 'Billable').toLowerCase() === 'yes';
}

// Reads a column, treating Toggl's "-" placeholder (and blanks) as missing.
function field(row, key) {
	var value = (row[key] || '').trim();
	return value === '-' ? '' : value;
}

// Toggl labels the amount column with the currency, e.g. "Amount (USD)".
function findAmountKey(row) {
	return Object.keys(row).find(function(key) {
		return key.startsWith('Amount');
	}) || null;
}
