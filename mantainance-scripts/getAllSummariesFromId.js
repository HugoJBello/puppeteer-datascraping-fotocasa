
const args = process.argv.slice(2);
let id = args[0];

if (!id) {
    id = "scraping-fotocasa-raspberry2--2018-11-24_15_28_34"
    //id = "scraping-fotocasa-raspberry2--2018-11-21_15_28_34";
    //id = "scraping-fotocasa-testBB--2018-11-21_15_28_34";
    //id = "scraping-fotocasa--11_8_2018,_9_32_27_PM";
    //id = "scraping-fotocasa-raspberry2--2018-11-14_13_47_34";
    //
}

const SummariesRecorder = require("./SummariesFileRecorder");
const recorder = new SummariesRecorder(id);

recorder.saveAllSummariesInDirFromId();




