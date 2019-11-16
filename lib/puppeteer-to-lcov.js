
module.exports = class PuppeteerToLcov {
	constructor (test, coverage) {
		this.test = test;
		this.coverage = coverage;
	}

	output () {
		var output = "";
		output += "TN:" + this.getTestName() + "\n";
		for(var index in this.coverage)
		{
			output += this.getFileInformation(this.coverage[index]);
		}
		return output;
	}

	getTestName() {
		return this.test.fullTitle();
	}

	getFileInformation(coverageEntry)
	{
		var output = "";
		output += "SF:" + coverageEntry.url + "\n";
		// Need to add function stuff here, output zeroes for now
		output += "FNF:0\n";
		output += "FNH:0\n";
		output += this.getLineCoverage(coverageEntry.text, coverageEntry.ranges);
		output += "end_of_record\n";
		return output;
	}

	getLineCoverage(text, ranges) {
		var lines = 0;
		var hits = 0;
		var output = text.split('')
		.reduce((result, element, index) => {
			if(element == "\n")
				result.push(index);
			return result;
		}, [0])
		.reduce((result, element, index, array) => {
			if(index < array.length - 1)
				result.push(array.slice(index, index + 2));
			else
				result.push([element, text.length]);
			return result;
		}, [])
		.reduce((result, element, index) => {
			var coveredFlag = ranges.map(range => {
				return element[0] >= range.start && element[0] <= range.end
					&& element[1] >= range.start && element[1] <= range.end;
			}).reduce((result, element) => {
				return result || element
			}, false);
			lines += 1;
			hits += (coveredFlag ? 1 : 0);
			return result + "DA:" + (index + 1) + "," + (coveredFlag ? "1" : "0") + "\n";
		}, "");
		output += "LH:" + hits + "\n";
		output += "LF:" + lines + "\n";

		return output;
	}
}