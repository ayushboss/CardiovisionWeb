var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var plotlib = require("nodeplotlib");

app.use(express.static("/public"));
app.use(bodyParser.urlencoded({ extended: true }))
app.listen(8080, () => {
	console.log("Listening on port 8080.");
});

app.get('/', (req,res) => {
	console.log("test");
	res.sendFile(__dirname+"/public/home.html");
});

app.get('/custom', (req,res)=> {
	console.log("custom link");
	res.sendFile(__dirname+"/public/custom.html");
})

app.post('/generate_graph', (req,res) => {
	var heartrate = req.body.heartrate;
	var time = req.body.time;
	var leftVentrPressure = req.body.leftVentrPressure;
	var leftAtrPressure = req.body.leftAtrPressure;
	var aorticPressure = req.body.aorticPressure;
	var atrialPressure = req.body.atrialPressure;
	var systemicVascularResistance = req.body.systemicVascularResistance;
	var mitralValveResistance = req.body.mitralValveResistance;

	// plot the curves with matplotlibnode

	console.log(mitralValveResistance)

	res.redirect("/custom")
})
