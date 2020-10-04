var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var plotlib = require("nodeplotlib");
var math = require("mathjs")

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
	console.log("checkpoint 0");
	var heartrate = parseInt(req.body.heartrate);
	var time = parseInt(req.body.time);
	var leftVentrPressure = parseInt(req.body.leftVentrPressure);
	var leftAtrPressure = parseInt(req.body.leftAtrPressure);
	var aorticPressure = parseInt(req.body.aorticPressure);
	var arterialPressure = parseInt(req.body.atrialPressure);
	var systemicVascularResistance = parseInt(req.body.systemicVascularResistance);
	var mitralValveResistance = parseInt(req.body.mitralValveResistance);

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
	var Rs = 1;
	var Rm = 0.0050;
	var Ra = 0.0010;
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

	console.log("checkpoint 1");


	while(t<=tc) {
		dt=10;
		tn = (t-Math.floor(t))/Tmax;
		
		//normalized elastance from double hill equation
		En = 1.55*Math.pow(tn/0.7, 1.9)/(1+Math.pow(tn/0.7, 1.9))*(1/(1+Math.pow(tn/1.17, 21.9)));

		E[i] = (Emax-Emin)*En + Emin;
		LVV[i] = LVP[i]/E[i] + V0;
		Cv[i] = 1/E[i];

		console.log("E: " + E[i])
		console.log("LVV: " + LVV[i])
		console.log("Cv: " + Cv[i])

		console.log("LVV Full: " + LVV);
		
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

		console.log("A: " + math.matrix(A));
		console.log(math.multiply(math.matrix(A), math.matrix(X)))

		// here is the main error, A*X does not multiply out to get a correct value.

		console.log("A*X: " + math.multiply(math.matrix(A), math.matrix(X)));

		dx = math.multiply(math.matrix(A), math.matrix(X)) + math.multiply(math.matrix(B), math.matrix(C));

		console.log(X);

		console.log("dx: " + dx)
		console.log(typeof(dx[0]));

		dx = math.multiply(dt, dx);


		LVP[i+1] = LVP[i] + dx[0][0];
		LAP[i+1] = LAP[i] + dx[1][0];
		AP[i+1] = AP[i] + dx[2][0];
		AOP[i+1] = AOP[i] + dx[3][0];
		Qa[i+1] = Qa[i] + dx[4][0];
		
		t += dt;
		Time[i+1] = t;

		i++;
	}
	
	i++;
	tn = (t-Math.floor(t))/Tmax;
	En = 1.55*Math.pow(tn/0.7, 1.9)/(1+Math.pow(tn/0.7, 1.9))*(1/(1+Math.pow(tn/1.17, 21.9)));
	E[i] = (Emax-Emin)*En + Emin;
	LVV[i] = LVP[i]/E[i] + V0;

	console.log(mitralValveResistance)

	res.redirect("/custom")
})

