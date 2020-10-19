var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var plotlib = require("nodeplotlib");
var math = require("mathjs");
var open = require("open");
var plotly = require('plotly')("ayushboss", "dnQPvFSjFVfOcQgZSm2u")

var port = process.env.PORT || 8080;

app.use(express.static("/public"));
app.use(bodyParser.urlencoded({ extended: true }))
app.listen(port, () => {
	console.log("bruh: " + __dirname);
	console.log("Listening on port 8080.");
});

app.get('/', (req,res) => {
	console.log("test");
	res.sendFile(__dirname+"/public/index.html");
});

app.get('/custom', (req,res)=> {
	console.log("custom link");
	res.sendFile(__dirname+"/public/custom.html");
})

app.get('/waiting', (req,res)=> {
	console.log("waiting for the graphs to be built");
	res.sendFile(__dirname+"/public/waiting.html")
})

app.get('/home', (req,res) => {
	res.redirect("/");
});

app.get('/index', (req,res) => {
	res.redirect("/");
});

app.get('/info', (req,res) => {
	res.sendFile(__dirname+"/public/info.html");
});

app.get('/normal', (req,res)=> {
	res.sendFile(__dirname+"/public/normal.html");
})

app.get('/hypertension', (req,res)=> {
	console.log("custom link");
	res.sendFile(__dirname+"/public/hypertension.html");
})

app.get('/hypotension', (req,res)=> {
	console.log("custom link");
	res.sendFile(__dirname+"/public/hypotension.html");
})

app.get('/mitral_stenosis', (req,res)=> {
	console.log("custom link");
	res.sendFile(__dirname+"/public/mitral-stenosis.html");
})

app.get('/aortic_stenosis', (req,res)=> {
	console.log("custom link");
	res.sendFile(__dirname+"/public/aortic-stenosis.html");
})

app.post('/generate_graph', (req,res) => {

	var heartrate = Number(req.body.heartrate);
	var leftVentrPressure = Number(req.body.leftVentrPressure);
	var leftAtrPressure = Number(req.body.leftAtrPressure);
	var aorticPressure = Number(req.body.aorticPressure);
	var arterialPressure = Number(req.body.atrialPressure);
	var systemicVascularResistance = Number(req.body.systemicVascularResistance);
	var mitralValveResistance = Number(req.body.mitralValveResistance);
	// plot the curves with matplotlibnode 

	var LVP = new Array(10002);
	var LAP =  new Array(10002);
	var AP = new Array(10002);
	var AOP =  new Array(10002);
	var Qa =  new Array(10002);

	LVP[0] = leftVentrPressure;
	LAP[0] = leftAtrPressure;
	AP[0] = arterialPressure;
	AOP[0] = aorticPressure;
	Qa[0] = 0;

	var Cv = [];
	var t = 0;

	var dx = new Array(5);
	dx.fill(new Array(1))

	var HR = heartrate;
	var tc = 60/HR;
	var Tmax = 0.2 + 0.15*tc;
	var Rs = systemicVascularResistance;
	var Ra = Number(req.body.aorticResistance);
	console.log("Ra: " + Ra);
	console.log(mitralValveResistance)
	var Rm = mitralValveResistance;
	var Rc = 0.0398;
	var Cr = 4.4000;
	var Cs = 1.3300;
	var Ca = 0.0800;
	var Ls = 0.0005;
	var Emax = 2;
	var Emin = .06;
	var V0 = 10;

	var i = 0;
	var tn = 0.0; //proportion of total time that has passed (t/Tmax)
	var En = 0.0; //normalized elastance
	var Dm = 0.0; //mitral diode on or off
	var Da = 0.0; //aortic dioide on or off
	var dCv = 0; //differentiated compliance
	var Tn = new Array(10002); //array of tn
	Tn[0] = t;
	var E = new Array(10002); //array for elastance over time
	var LVV = new Array(10002); //left ventricular volume over time
	var Time = new Array(10002); //counting the discrete time steps; for graphing purposes
	var dt = 0.0001;

	console.log("checkpoint 1");


	while(t<=tc) {
		tn = (t-Math.floor(t))/Tmax;
		
		//normalized elastance from double hill equation
		En = 1.55*Math.pow(tn/0.7, 1.9)/(1+Math.pow(tn/0.7, 1.9))*(1/(1+Math.pow(tn/1.17, 21.9)));

		E[i] = (Emax-Emin)*En + Emin;
		LVV[i] = LVP[i]/E[i] + V0;
		Cv[i] = 1/E[i];

		// console.log("E: " + E[i])
		// console.log("LVV: " + LVV[i])
		// console.log("Cv: " + Cv[i])

		// console.log("LVV Full: " + LVV);
		
		if(LAP[i] > LVP[i]) //determine if mitral valve opens
			Dm = 1;
		else
			Dm = 0;
		if(LVP[i] > AOP[i]) //determine if aortic valve opens
			Da = 1;
		else
			Da = 0;
		if(i>1) 
			dCv = (Cv[i]-Cv[i-1])/dt; //change in compliance
		else
			dCv = 0;
		
		A = [[-dCv/Cv[i],0,0,0,0],
	        [0,-1/(Rs*Cr),1/(Rs*Cr),0,0],
	        [0,1/(Rs*Cs),-1/(Rs*Cs),0,1/Cs],
	        [0,0,0,0,-1/Ca],
	        [0,0,-1/Ls,1/Ls,-Rc/Ls]];

	    B = [[1/Cv[i],-1/Cv[i]],
	        [-1/Cr,0],
	        [0,0],
	        [0,1/Ca],
	        [0,0]];

	    C = [[(LAP[i] - LVP[i])*Dm/Rm],
	        [(LVP[i] - AOP[i])*Da/Ra]];

		var aMatrix = math.matrix(A);
		var X = [[LVP[i]], [LAP[i]], [AP[i]], [AOP[i]], [Qa[i]]];
		var xMatrix = math.matrix(X);

		dx = math.add(math.multiply(aMatrix, xMatrix),math.multiply(math.matrix(B), math.matrix(C)));
		dx = math.multiply(dt, dx);

		LVP[i+1] = LVP[i] + math.subset(dx, math.index(0, 0));
		LAP[i+1] = LAP[i] + math.subset(dx, math.index(1, 0));
		AP[i+1] = AP[i] + math.subset(dx, math.index(2, 0));
		AOP[i+1] = AOP[i] + math.subset(dx, math.index(3, 0));
		Qa[i+1] = Qa[i] + math.subset(dx, math.index(4, 0));
		
		t += dt;
		Time[i+1] = t;

		i++;
	}
	
	i++;
	tn = (t-Math.floor(t))/Tmax;
	En = 1.55*Math.pow(tn/0.7, 1.9)/(1+Math.pow(tn/0.7, 1.9))*(1/(1+Math.pow(tn/1.17, 21.9)));
	E[i] = (Emax-Emin)*En + Emin;
	LVV[i] = LVP[i]/E[i] + V0;

	res.redirect('/waiting');

	var dataLVPvsLVV = [{x:LVV, y:LVP, type: 'line'}];

	var urlLVPLVV;

	var layoutLVPLVV = {
	  title: "Left Ventricular Pressure vs Left Ventricular Volume",
	  xaxis: {
	    title: "Volume (mL)",
	    titlefont: {
	      family: "Courier New, monospace",
	      size: 18,
	      color: "#7f7f7f"
	    }
	  },
	  yaxis: {
	    title: "Pressure (mmHg)",
	    titlefont: {
	      family: "Courier New, monospace",
	      size: 18,
	      color: "#7f7f7f"
	    }
	  }
	};

	var graphOption1 = {layout: layoutLVPLVV, fileopt : "overwrite", filename : "LVP vs LVV"};

	plotly.plot(dataLVPvsLVV, graphOption1, function (err, msg) {
			if (err) return console.log(err);
			console.log(msg.url);
			urlLVPLVV = String(msg.url);
			open( urlLVPLVV, function (err) {
  				if ( err ) throw err;    
			});	
	});

	var dataQaVsTime = [{x:Time, y:Qa, type: 'line'}];
	var layoutQaTime = {
	  title: "Flow Rate vs Time",
	  xaxis: {
	    title: "Time (s)",
	    titlefont: {
	      family: "Courier New, monospace",
	      size: 18,
	      color: "#7f7f7f"
	    }
	  },
	  yaxis: {
	    title: "Flow Rate (ml/s)",
	    titlefont: {
	      family: "Courier New, monospace",
	      size: 18,
	      color: "#7f7f7f"
	    }
	  }
	};

	var graphOption2 = {layout: layoutQaTime, fileopt : "overwrite", filename : "Qa vs Time"};

	var urlQaTime;

	plotly.plot(dataQaVsTime, graphOption2, function (err, msg) {
			if (err) return console.log(err);
			console.log(msg.url);
			urlQaTime = String(msg.url);

			open( urlQaTime, function (err) {
  				if ( err ) throw err;    
			});	
	});

	var firstPlotTrace = {
	    x: Time,
	    y: LVP,
	    type: 'scatter',
	    name: 'Left Ventricular Pressure vs Time'
	};

	var secondPlotTrace = {
	    x: Time,
	    y: LAP,
	    type: 'scatter',
	    name: 'Left Atrial Pressure vs Time'
	};

	var thirdPlotTrace = {
	    x: Time,
	    y: AP,
	    type: 'scatter',
	    name: 'Atrial Pressure vs Time'
	};

	var fourthPlotTrace = {
	    x: Time,
	    y: AOP,
	    type: 'scatter',
	    name: 'Aortic Pressure vs Time'
	};

	var plotData = [firstPlotTrace, secondPlotTrace, thirdPlotTrace, fourthPlotTrace];
	var layoutXTime = {
	  title: "Cardiac Cycle",
	  xaxis: {
	    title: "Time (s)",
	    titlefont: {
	      family: "Courier New, monospace",
	      size: 18,
	      color: "#7f7f7f"
	    }
	  },
	  yaxis: {
	    title: "Pressure (mmHg)",
	    titlefont: {
	      family: "Courier New, monospace",
	      size: 18,
	      color: "#7f7f7f"
	    }
	  }
	};

	var graphOption3 = {layout: layoutXTime, fileopt : "overwrite", filename : "X vs Time"};

	plotly.plot(plotData, graphOption3, function (err, msg) {
		if (err) return console.log(err);
		console.log(msg.url);
		urlXTime = String(msg.url);

		open( urlXTime, function (err) {
			if ( err ) throw err;    
		});
	});
})

