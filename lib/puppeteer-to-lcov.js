
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
		return output;
	}

	getLineCoverage(text, ranges) {
		var newlinesIndeces = text.reduce((array, element, index) => {
			if(element == "\n")
				carry.push(index);
		}, []);
		
	}
}