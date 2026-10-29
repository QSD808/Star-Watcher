import * as SunCalc from 'https://cdn.jsdelivr.net/npm/suncalc@2.1.1/+esm' // library used for moon illumination calculations
import constellations from './constellations.json' with { type: 'json' }; //list of constellations with their stars

//function to add padding 0's
function addZero(input, length) {
  let output = input.toString();
  while (output.length < length) {output = "0" + output;}
  return output;
}
//functions to hide and show elements
function hideElement(elementId) {
    const element = document.getElementById(elementId);
    element.style.display = 'none';
}

function showElement(elementId) {
    const element = document.getElementById(elementId);
    element.style.display = 'inline-block'; 
}
//functions to hide elements that have a cool collapse/expand animation
function collapseElement(elementId) {
  document.getElementById(elementId).style.height = 0;
}

function expandElement(elementId) {
  document.getElementById(elementId).style.height = document.getElementById(elementId).scrollHeight + "px";
}
//function that uses the open meteo api to return the cloudcover at this time in percent
let cloudCover;
const getClouds = async (lat, long, needRefresh) => {
  if (cloudCover && !needRefresh) {return cloudCover;}
  let response;
  try {
    response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&current=cloud_cover`);
  } catch {
    alert('Something went wrong with the wheather API, try waiting or refreshing');
    return NaN;
  }
  const myJson = await response.json();
  cloudCover = myJson.current.cloud_cover;
  return myJson.current.cloud_cover;
}

//function that returns the moon brightness using the Suncalc library
function getMoonLight() {
  const {fraction} = SunCalc.getMoonIllumination(new Date());
  return fraction;
}

//options for the location function
const options = {
  timeout: 15000,
};

//function that returns the current positions of the user
function getPosition() {
  const latInp = document.getElementById('latInp');
  const lonInp = document.getElementById('lonInp');
  const useCurrent = document.getElementById('useCurLoc')

  if (useCurrent.checked) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position);
        },
        (error) => {
          console.log(error.message);
          alert('using inputted position instead of current because something went wrong')
          let latitude = latInp.value;
          if (!latitude) {latitude = 0}
          let longitude = lonInp.value;
          if (!longitude) {longitude = 0}
          useCurrent.checked = false;
          latInp.value = latitude;
          lonInp.value = longitude;
          resolve({coords: {latitude: Number(latitude), longitude: Number(longitude)}});
        },
        options
      );
    });
  } else {
    let latitude = latInp.value;
    if (!Number(latitude) || Math.abs(Number(latitude)) > 90) {latitude = 0; alert('invalid latitude value, used default (0)');}
    let longitude = lonInp.value;
    if (!Number(longitude) || Math.abs(Number(longitude)) > 180) {longitude = 0; alert('invalid longitude value, used default (0)');}
    return({coords: {latitude: Number(latitude), longitude: Number(longitude)}});
  }

  
}

let position;

//function that calculates the score for stargazing
async function calculateScore() {
  //define variables
  const pos = position;
  const cloudLevel = await getClouds(pos.coords.latitude, pos.coords.longitude);
  const moonLight = await getMoonLight()
  const times = SunCalc.getTimes(new Date(), pos.coords.latitude , pos.coords.longitude)
  const sunPos = SunCalc.getPosition((new Date()), pos.coords.latitude, pos.coords.longitude)

  //calculate score
  const cloudScore = 1 - (cloudLevel/100);
  const moonScore = 1 - moonLight * Math.max(0, Math.sin((SunCalc.getMoonPosition(new Date(), pos.coords.latitude , pos.coords.longitude).altitude))*Math.PI/180);
  const sunScore =  Math.min(1, Math.max(0, -sunPos.altitude / 18));
  let score = Math.min(10, sunScore * cloudScore * moonScore * 10);
  
  return [times, cloudScore, moonScore, sunScore, score];
  }

//displays the score to the user
async function displayScore() {
  //display the score
  const [times, cloudScore, moonScore, sunScore, score] = await calculateScore();
  hideElement("scoreBtn");
  showElement("score-wrapper");
  document.getElementById("score").innerHTML = Math.round(score*10)/10 + "/10";
  displayScoreInfo();
}

//Shows extra information about the score
async function displayScoreInfo() {
  const [times, cloudScore, moonScore, sunScore, score] = await calculateScore();

  //Show extra information and hide buttons
  hideElement("scoreInfoBtn");
  showElement('scoreInfoHideBtn');

  document.getElementById("cloudScore").innerHTML = `Cloudscore: ${Math.min(Math.max(0, Math.round(cloudScore*100)/10), 10)}/10 <span class="specificScoreTxt" style="color: grey;font-size:small;">A score based on the current cloudcover. 10/10 means no clouds and 0/10 means the entire sky is covered by clouds.</span>`;
  document.getElementById("moonScore").innerHTML = `Moonscore: ${Math.min(Math.max(0, Math.round(moonScore*100)/10), 10)}/10 <span class="specificScoreTxt" style="color: grey;font-size:small;">A score based on the current brightness of the moon. 10/10 means no moon brightness(new moon) and 0/10 means the moon is very bright(full moon).</span>`;
  document.getElementById("sunScore").innerHTML = `Sunscore: ${Math.min(Math.max(0, Math.round(sunScore*90-10)/10), 10)}/10 <span class="specificScoreTxt" style="color: grey;font-size:small;">A score based on the current brightness of the sun. 10/10 means the sun is at its dimmest (middle of the night) and 0/10 means the sun is at its brightest(around 12:00).</span>`;
  expandElement('scoreInfo');
}

//Function that hides the extra score info
function hideScoreInfo() {
  collapseElement('scoreInfo');
  hideElement('scoreInfoHideBtn');
  showElement('scoreInfoBtn');
}

async function showAll () {
  hideElement('compassError');
  hideElement('pitch') //hide the pitch
  position = await getPosition(); //gets the position
  //set values for star and planet things
  observer = new Astronomy.Observer(position.coords.latitude, position.coords.longitude, 0);
  time = new Astronomy.AstroTime(new Date());

  updateConstList(); //show list with consts
  showPlanetList(); //show list whith palents

  displayScore (); //display the score
  showElement('planetWrapper');//shows planetwrapper
  //expand everything else the user needs to see whith a slick animation
  drawCompass();
  drawGraph(false);
  expandElement('compass');
  expandElement('constellations');
  expandElement('planets');
  showElement('refreshDiv');
}

// Attach click listeners for score display and info expansion.
document.getElementById('scoreBtn').addEventListener('click', showAll);
document.getElementById('scoreInfoBtn').addEventListener('click', displayScoreInfo);
document.getElementById('scoreInfoHideBtn').addEventListener('click', hideScoreInfo);




// -----------------------------------------------------------------------------
// Forecast graph setup
// -----------------------------------------------------------------------------

//function used to draw graph
let graph;
async function drawGraph (needRefresh) {
// Arrays to store forecast labels and score values for the chart.
  const xValues = [];
  const cloudValues = [];
  const moonValues = [];
  const scoreValues = [];
  const sunValues = [];

  const pos = position; //Get position for next step
  let response;
  try {
    response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&hourly=cloud_cover&models=ecmwf_ifs&forecast_days=3&timeformat=unixtime`) //get the cloud forecast for the next 3 days
  } catch {
    response = {NaN};
    alert('Something went wrong with the graph, try waiting or refreshing')
  }
  const myJson = await response.json();
  const date1 = new Date();

  //get data for graph
    for (let i = 0; i < myJson.hourly.time.length; i++) {
      const date2 = new Date(myJson.hourly.time[i] * 1000)
      
      if (date1.getTime() < date2.getTime()) {
          xValues.push(date2.getDate() + "/" + (date2.getMonth()+1) + " " + date2.getHours() + ":00"); //Xvalue label
          cloudValues.push((100 - myJson.hourly.cloud_cover[i])/10); //cloudscore
          const {fraction} = SunCalc.getMoonIllumination(date2); //Moonscore
          const moonScore = Math.min(1, 1-fraction * Math.max(0, Math.sin(SunCalc.getMoonPosition(date2, pos.coords.latitude , pos.coords.longitude).altitude * Math.PI / 180)));
          moonValues.push(moonScore * 10); //Moonscore
          const sunPos = SunCalc.getPosition(date2, pos.coords.latitude, pos.coords.longitude); //Sunscore
          const sunScore =  Math.min(1, Math.max(0, -sunPos.altitude / 18));
          sunValues.push(sunScore*10); //sunscore
          scoreValues.push(Math.min((100 - myJson.hourly.cloud_cover[i])/100 * moonScore * 10 * sunScore, 10)); //Actual score
      }
    }

  //Draw graph using chart.JS
  const graphCtx = document.getElementById('futureGraph').getContext('2d');
  if (needRefresh) {graph.destroy();}

  graph = new Chart(graphCtx, {
    type: "line",
    data: {
      labels: xValues,
      datasets: [{
        label: 'Future cloudscore',
        data: cloudValues,
        borderColor: "#b8b3ec",
        pointRadius: 2,
        tension: 0.4,
        hidden: true
      },
      {
        label: 'Future moonscore',
        data: moonValues,
        borderColor:  "#ecb3b3",
        pointRadius: 2,
        tension: 0.4,
        hidden: true
    },
    {
        label: 'Future sun brightness score',
        data: sunValues,
        borderColor:  "#ece3b3",
        pointRadius: 2,
        tension: 0.4,
        hidden: true
    },
    { 
        label: 'Future score',
        data: scoreValues,
        borderColor: "#E9E8ED",
        pointRadius: 2,
        tension: 0.4,
      },]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: true,
          // labels: {}
        },
        title: {
          display: false,
          text: "Future scores",
          font: {size: 16}}
      },
      scales: {
        y: {
          min:0,
          max:10,
        }
      }
    }
  });
}


// -----------------------------------------------------------------------------
// Animated star background
// -----------------------------------------------------------------------------

// Canvas elements and rendering context for the star field.
const canvas = document.getElementById('stars');
const starCtx = canvas.getContext('2d');
let stars = [];
let w, h;

// Generate a set of random star particles across the screen.
function generateStars() {
  //Get width and height from screen
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;

  const count = Math.min(Math.floor((w * h) / 3000), 500); //let there be around 1star per 3000px

  for (let i = 0; i < count; i++) {
    const star = {
      x: Math.random() * w,
      y: Math.random() * h,
      radius: Math.random() * 1.4 + 0.4,        
      dimmest: Math.random() * 0.5 + 0.2,    
      addedBrightness: Math.random() * 0.5 + 0.3,      
      speed: Math.random() * 0.004 + 0.001,       
      phase: Math.random() * Math.PI * 2           
    };
    stars.push(star);
  }
}

// Animate stars by adjusting each star's opacity over time.
function draw(time) {
  starCtx.clearRect(0,0,w,h);
  for (const s of stars) {
    let opacity = s.dimmest + Math.sin(time*s.speed+s.phase) * s.addedBrightness;
    if (opacity > 1) {opacity = 1;}
    if (opacity < 0) {opacity = 0;}

    starCtx.beginPath();
    starCtx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    starCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    starCtx.fill();
  }

  requestAnimationFrame(draw);
}

generateStars();
requestAnimationFrame(draw);


//------------------------------------------------------------------------------------------------------------
//PLANETS
//------------------------------------------------------------------------------------------------------------

//Search for visible planets

let observer;
let time;

//list of planets
const bodies = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

//shows list of planets with basic info
function showPlanetList() {
  document.getElementById("planetBtns").replaceChildren(); //removes all current planets in list
  for (const body of bodies) {
    const equator = Astronomy.Equator(body, time, observer, true, true);
    const horizon = Astronomy.Horizon(time, observer, equator.ra, equator.dec, 'normal');
    const isUp = horizon.altitude > 0;

    const btn = document.createElement('button');
    btn.id = `${body}Btn`;
    btn.className = 'bodyBtn';
    btn.innerHTML = `${body} <span style="color: grey;font-size:small;">${isUp ?  Math.round(horizon.altitude) + "°": "Not visible"}</span>`;

    document.getElementById("planetBtns").appendChild(btn);
    document.getElementById("planetBtns").appendChild(document.createElement('br'));

    btn.addEventListener('click',() => showPlanetInfo(body)); //makes every planet clickable
  }}

var planetDistUnit = "AU"; //unit of planetdistance

//function that show extra planet info
function showPlanetInfo(body) {
  //set up needed things
  const equator = Astronomy.Equator(body, time, observer, true, true);
  const horizon = Astronomy.Horizon(time, observer, equator.ra, equator.dec, 'normal');

  //get rise and set dates
  const riseDate = Astronomy.SearchRiseSet(body, observer, 1, time, (horizon.altitude > 0)? -10: 10).date;
  const formattedRise = `${riseDate.getDate()}/${riseDate.getMonth()+1} ${addZero(riseDate.getHours(), 2)}:${addZero(riseDate.getMinutes(), 2)}`;
  
  const setDate = Astronomy.SearchRiseSet(body, observer, -1, time, 10).date;
  const formattedSet = `${setDate.getDate()}/${setDate.getMonth()+1} ${addZero(setDate.getHours(), 2)}:${addZero(setDate.getMinutes(), 2)}`;

  //diplay the set, rise anddistance
  const info = `<span style="font-size:large;">${body}</span><br><span style="font-size:small;">Rise:</span> ${formattedRise}<br><span style="font-size:small;">Set:</span> ${formattedSet}<br><span style="font-size:small;">Distance:</span> <button id="planetDistanceBtn">${Math.round(100*equator.dist)/100} AU</button><span style="font-size:x-small;color:grey;font-style:italic">(Press to change units)</span>`;
  planetDistUnit = "AU";
  document.getElementById('planetInfoText').innerHTML = info;
  document.getElementById("planetDistanceBtn").addEventListener('click',() => changeUnitsPlanetDist(body));

  shownLabel = body;
  highlighted = body;
  expandElement('planets'); //fix layout of div
  drawCompass(); //update compass
}

//function to change the distance unit
function changeUnitsPlanetDist (body){
  const equator = Astronomy.Equator(body, time, observer, true, true);
  switch (planetDistUnit) {
    case "AU":
      document.getElementById("planetDistanceBtn").innerHTML = `${Math.round(10*equator.dist*149.597870)/10}M KM`;
      planetDistUnit = "KM";
      return;
    case "KM":
      document.getElementById("planetDistanceBtn").innerHTML = `${Math.round(10*equator.dist* 92.955807)/10}M miles`;
      planetDistUnit = "miles";
      return;
    case "miles":
      document.getElementById("planetDistanceBtn").innerHTML = `${Math.round(100*equator.dist)/100} AU`;
      planetDistUnit = "AU";
      return;
  }
}

//Hide and show planet info
function hidePlanets () {
  collapseElement('planets');
  hideElement('minPlanetBtn');
  showElement('maxPlanetBtn');
}
function showPlanets () {
  expandElement('planets');
  showElement('minPlanetBtn');
  hideElement('maxPlanetBtn');
}
document.getElementById('minPlanetBtn').addEventListener('click', hidePlanets);
document.getElementById('maxPlanetBtn').addEventListener('click', showPlanets);
//------------------------------------------------------------------------------------------------------------
// constellations =(consts)
//------------------------------------------------------------------------------------------------------------
//list with const visible on compass
let compassConst = [ //Now loaded with default constellations
  "Ari", "Tau", "Gem", "Cnc", "Leo", "Vir",
  "Lib", "Sco", "Sgr", "Cap", "Aqr", "Psc",
  "UMa", "UMi", "Ori", "Cas", "Cyg", "CMa",
  "Lyr", "Aql", "Boo", "Per", "And", "Peg",
];


//add consts to site
document.getElementById("onlyShowVis").addEventListener('change', updateConstList);
document.getElementById("searchConst").addEventListener('input', updateConstList);

//update list with the const when searching or changing filters
function updateConstList() {
  const onlyShowVisible = document.getElementById("onlyShowVis").checked;
  const searchValue = document.getElementById("searchConst").value;

  document.getElementById("constList").innerHTML = "";
  for (const key in constellations) {
    const constellation = constellations[key];

    let altitude;
    let isVisible = false;
    for (const star of constellation.stars) {
      const horizon = Astronomy.Horizon(time, observer, star.ra, star.dec, 'normal');
      if (horizon.altitude > 0) {
        isVisible = true;
        altitude = horizon.altitude;
      }
    }

    const constDiv = document.createElement('div');
    constDiv.style.display = 'flex';
    constDiv.style.flexDirection = 'row';
    constDiv.style.justifyContent = 'space-between';

    const checkDiv = document.createElement('div');
    checkDiv.className = 'toggle';

    const checkBox = document.createElement('input');
    checkBox.type = 'checkbox';
    checkBox.className = 'ConstCheckbox';
    checkBox.id = `${constellations[key].abbreviation}Lbl`;
    checkBox.checked = compassConst.includes(constellations[key].abbreviation);
    checkDiv.appendChild(checkBox);
    checkDiv.appendChild(document.createElement('label'));

    const label = document.createElement('label');
    label.htmlFor = `${constellations[key].abbreviation}Lbl`;
    label.className = 'hideTest';
    
    const updateLabel = () => {
      label.textContent = checkBox.checked ? "Hide on compass" : "Show on compass";
    };
    updateLabel();

    const btn = document.createElement('button');
    btn.id = `${key}Btn`;
    btn.className = 'constBtn';
    btn.innerHTML = `${constellation.name} <span style="color: grey;font-size:small;">${isVisible?  Math.round(altitude) + "°": "Not visible"}</span>`;

    const rightDiv = document.createElement('div');
    rightDiv.style.display =  'flex';
    rightDiv.className = 'rightDivConstList'
    rightDiv.appendChild(label);
    rightDiv.appendChild(checkDiv);

    constDiv.appendChild(btn);
    constDiv.appendChild(rightDiv);

    if (!(!isVisible && onlyShowVisible) && (constellation.name.toLowerCase().includes(searchValue.toLowerCase()))) {
    document.getElementById("constList").appendChild(constDiv);
    }
    btn.addEventListener('click',() => showConstInfo(constellation));
    checkBox.addEventListener('change',() => {changeCompassConst(constellation.abbreviation); updateLabel();});
  }
}

//changes the shown consts on the compass
function changeCompassConst(constallation) {
  if (compassConst.includes(constallation)) {
    compassConst = compassConst.filter(function(item) {
    return item !== constallation
      })
  } else {
    compassConst.push(constallation);
  }
  drawCompass(constallation); 
}

//shows const info
let shownConstLabel;
let highlightedConst;
function showConstInfo(constellation) {
  drawCompass(constellation);
  const horizon = Astronomy.Horizon(time, observer, constellation.stars[0].ra, constellation.stars[0].dec, 'normal');

  const star = constellation.stars[0];
  Astronomy.DefineStar(Astronomy.Body.Star1, star.ra, star.dec, (star.distanceParsecs != null? star.distanceParsecs * 3.2616: 1))

  const riseDate = Astronomy.SearchRiseSet(Astronomy.Body.Star1, observer, 1, time, (horizon.altitude > 0)? -10: 10);
  const formattedRise = riseDate != null?`${riseDate.date.getDate()}/${riseDate.date.getMonth()+1} ${addZero(riseDate.date.getHours(), 2)}:${addZero(riseDate.date.getMinutes(), 2)}`: horizon.altitude > 0? 'Always above horizon': 'Always below horizon';
  
  const setDate = Astronomy.SearchRiseSet(Astronomy.Body.Star1, observer, -1, time, 10);
  const formattedSet = setDate != null?`${setDate.date.getDate()}/${setDate.date.getMonth()+1} ${addZero(setDate.date.getHours(), 2)}:${addZero(setDate.date.getMinutes(), 2)}`: horizon.altitude > 0? 'Always above horizon': 'Always below horizon';

  const constSVG = createConstSVG(constellation);

  const info = `${constSVG}<p id="constInfoText"><span style="font-size:large;">${constellation.name}</span><br><span style="font-size:small;">Rise:</span> ${formattedRise}<br><span style="font-size:small;">Set:</span> ${formattedSet}<br><span style="font-size:small;">meaning:</span> ${constellation.meaning}</p>`;
  document.getElementById('constInfo').innerHTML = info;
  expandElement('constellations');
  shownConstLabel = constellation;
  highlightedConst = constellation;
  drawCompass();
}

//creates a little contellation image
function createConstSVG(constellation) {
  let outputSVG = '<svg width="100" height="100" style="border-style: solid; border-color: white; background-color: rgb(11, 0, 75);">';
  const centerStar = Astronomy.Horizon(time, observer, constellation.stars[0].ra, constellation.stars[0].dec, 'normal');
  const azimuthScale = Math.cos(centerStar.altitude * Math.PI / 180);
  let starPosX = [];
  let starPosY = [];
  const starName = [];

  for (const star of constellation.stars) {
    const horizon = Astronomy.Horizon(time, observer, star.ra, star.dec, 'normal');
    let deltaAz = (horizon.azimuth - centerStar.azimuth);
    if (deltaAz > 180) deltaAz -= 360;
    if (deltaAz < -180) deltaAz += 360;
    deltaAz *= azimuthScale;
    const deltaAlt =  centerStar.altitude - horizon.altitude;
    starPosX.push(deltaAz);
    starPosY.push(deltaAlt);
    starName.push(star.name);
  }

  const Xscale = Math.max(...starPosX) - Math.min(...starPosX);
  const Yscale = Math.max(...starPosY) - Math.min(...starPosY);
  const scale = 80/Math.max(Xscale, Yscale);
  const minX = Math.min(...starPosX);
  const minY = Math.min(...starPosY);
  const horizonLines = [];

  if (Xscale > Yscale){
    starPosX = Array.from(starPosX, (x) => scale*x + (-scale*minX + 10));
    starPosY = Array.from(starPosY, (y) => scale*y - minY*scale + (100 - scale*Yscale)/2);
    for (let i = -180; i <= 180; i+=1) {
      horizonLines.push(scale*(centerStar.altitude - i)- minY*scale + (100 - scale*Yscale)/2)
    }}

  else {
    starPosY = Array.from(starPosY, (y) => scale*y + (-scale*minY + 10));
    starPosX = Array.from(starPosX, (x) => scale*x - scale*minX + (100 - scale*Xscale)/2);
    for (let i = -180; i <= 180; i += 1) {
      horizonLines.push(scale*(centerStar.altitude - i) - scale*minY + 10);
    }
  }

  //Draw horizontal lines
  const linesCount = horizonLines.filter(n => n >= 0 && n <= 100).length;
  const niceSteps = [1, 2, 5, 10, 15, 20, 30, 45];
  const lineStep = niceSteps.find(s => linesCount / s <= 5) ?? 45;
  for (const lineY of horizonLines){
    if (lineY >= 0 && lineY <= 100 && (horizonLines.indexOf(lineY)-180) % lineStep === 0) {
      outputSVG += `<line x1="0" x2="100" y1="${lineY}" y2="${lineY}" stroke="rgba(233, 232, 237, 0.5)" stroke-width="1"/>`;
      outputSVG += `<text x="5" y="${lineY < 90? lineY+5: lineY - 5}" fill="rgba(233, 232, 237, 0.5)" font-size="7">${horizonLines.indexOf(lineY)-180}°</text>`
  }}


  //Draw lines between stars
  for (const line of constellation.lines) {
    outputSVG += '<polyline stroke="white" fill="none" points="'
    for (const star of line) {
      const index = starName.indexOf(star);
      if (index != -1) {
       outputSVG += starPosX[index] + ", " + starPosY[index] + " " 
      }
    }
    outputSVG += '"/>'
  }



  for (let i = 0; i < starPosX.length; i++) {
    outputSVG += `<circle cx="${starPosX[i]}" cy="${starPosY[i]}" r="${1 + 2*(6.5 - Math.max(-1.5, Math.min(6.5, constellation.stars[i].mag)))/8}" fill="rgba(233, 232, 237, 1)"/>`;
  }

  outputSVG += "</svg>";
  return outputSVG;
}

//Hide and show const info
function hideConst () {
  collapseElement('constellations');
  hideElement('minConstBtn');
  showElement('maxConstBtn');
}
function showConst () {
  expandElement('constellations');
  showElement('minConstBtn');
  hideElement('maxConstBtn');
}
document.getElementById('minConstBtn').addEventListener('click', hideConst);
document.getElementById('maxConstBtn').addEventListener('click', showConst);


//------------------------------------------------------------------------------------------------------------
//Refresh
//------------------------------------------------------------------------------------------------------------
async function refresh() {
  position = await getPosition("refresh"); //refresh user position
  getClouds(position.coords.latitude, position.coords.longitude, true); //get new cloud cover
  //refresh score
  displayScoreInfo();
  displayScore();
  //refresh graph
  drawGraph(true);
  //refresh time and place
  observer = new Astronomy.Observer(position.coords.latitude, position.coords.longitude, 0);
  time = new Astronomy.AstroTime(new Date());

  showPlanetList(true);  //refresh planets
  updateConstList()   //refresh consts
  drawCompass()   //refresh compass
}

document.getElementById('refreshBtn').addEventListener('click', refresh)

//Compass

document.getElementById('compassBtn').addEventListener('click', handleClick);

//function that enables compass
function handleClick() {
  
  if (typeof DeviceOrientationEvent === "undefined") {
    alert("Device orientation not supported on this device/browser.");
    return;
  }
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    // The API requires permission
    Promise.all([DeviceOrientationEvent.requestPermission(),
    ]).then(([orientationPermission]) => {
      if (
        orientationPermission === "granted"
      ) {
        window.addEventListener("deviceorientation", handleOrientation);
      }
      else {alert("Not accepted");}
    });
  } else {
    // No permission needed, add event listeners directly
    window.addEventListener("deviceorientation", handleOrientation);
  }
}

//function that enables compass orientation
function handleOrientation(event) {
  hideElement('compassBtn')
  const compass = document.getElementById("compassSVG");

  let heading;

  if (Number.isFinite(event.webkitCompassHeading)) {
    heading = event.webkitCompassHeading; // iOS
  } else if (event.absolute === true && event.alpha !== null) {
    // Explicitly Earth-referenced 
    heading = 360 - event.alpha;
  } else if (event.alpha !== null) {
    // Not guaranteed to be Earth-referenced
    heading = 360 - event.alpha;
    showElement('compassError');
    document.getElementById('compassError').innerHTML = ("Compass may not be accurate");
    expandElement('compass');
  } else {
    showElement('compassError')
    document.getElementById('compassError').innerHTML = ("Compass is currently not available on your device. It is possible your device or browser doesn't support this feature. Try switching devices or browsers.")
    expandElement('compass');
    return;
  }

    compass.setAttribute('transform', `rotate(${-heading}, ${center}, ${center})`); //Rotate compass
    //rotate letter in the other direction so they stay upright
    for (let i = 0; i < 360; i += 45) {
      const directionLetters = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      const pos = polarToXY(i, 0.75*compassRad);
      document.getElementById(directionLetters[i/45]).setAttribute('transform', `rotate(${heading}, ${pos.x}, ${pos.y})`);
    }
}


//Hide and show compass
function hideCompass () {
  collapseElement('compass');
  hideElement('minCompassBtn');
  showElement('maxCompassBtn');
}
function showCompass () {
  expandElement('compass');
  showElement('minCompassBtn');
  hideElement('maxCompassBtn');
}
document.getElementById('minCompassBtn').addEventListener('click', hideCompass);
document.getElementById('maxCompassBtn').addEventListener('click', showCompass);


//add buttons for planets on compass
document.getElementById("compassSVG").addEventListener('click', (e) => {
const b = e.target.dataset.body;
if (b) highlight(b); if (b) showPlanetInfo(b);
});

let highlighted;
function highlight (element) {
  highlighted = element;
  drawCompass();
}
//add labels on hover for planets on compass
document.getElementById("compassSVG").addEventListener('mouseover', (e) => {
const b = e.target.dataset.body;
if (b) showLabel(b);
});

let shownLabel;
function showLabel (label) {
  if (shownLabel === label) return;
  shownLabel = label;
  drawCompass();
}
//Remove the labels when you don't hover anymore
document.getElementById("compassSVG").addEventListener('mouseout', (e) => {
const b = e.target.dataset.body;
if (b) hideLabel();
});

function hideLabel () {
  shownLabel = "";
  drawCompass();
}

let center;
let compassRad;

//function used to calculate XY coordinates for in the compass
function polarToXY(azDeg, r) {
  const rad = ((azDeg - 90) * Math.PI) / 180;
  return { x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
}
function drawCompass() {
  var compassCode = ""
  compassRad = (document.getElementById('compassSVGWrap').getBoundingClientRect().width - 10) / 2;
  center = document.getElementById('compassSVGWrap').getBoundingClientRect().width / 2;

  compassCode += `<circle cx="${center}" cy="${center}" r="${compassRad}" fill="#020303" stroke="white" stroke-width="3"/>` //background Circle
  compassCode += `<circle cx="${center}" cy="${center}" r="${compassRad - 10}" fill="#020303" stroke="white" stroke-width="3"/>` //inner circle
  compassCode += `<circle cx="${center}" cy="${center}" r="${5}" fill="white"/>` //middle circle

  //lines around edge
  for (let i = 0; i < 360; i += 5) {
    const p1 = polarToXY(i, compassRad-10);
    const p2 = polarToXY(i, compassRad - (i % 45 === 0? 25: 10) - 10);
    compassCode += `<line x1="${p1.x}" x2="${p2.x}" y1="${p1.y}" y2="${p2.y}" stroke="white" stroke-width="3"/>`;
  }

  //Letters for directions
  for (let i = 0; i < 360; i += 45) {
    const directionLetters = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const pos = polarToXY(i, 0.75*compassRad);
    compassCode += `<text x="${pos.x - 10}" y="${pos.y - 10}" fill="white" ${i%90===0?'font-weight="bold"':""} font-size=${i%90===0?"20px":"15px"} id="${directionLetters[i/45]}">${directionLetters[i/45]}</text>`;
  }

  //Add Constellations
  const starPosX = [];
  const starPosY = [];
  const starName = [];
  for (const key in constellations) {
    let labelPos;
    if (compassConst.includes(constellations[key].abbreviation)) {
      for (const star of constellations[key].stars) {

        const horizon = Astronomy.Horizon(time, observer, star.ra, star.dec, 'normal');
        const angle = horizon.azimuth;
        const radius = (horizon.altitude > 0?(horizon.altitude/90 * -0.6 + 0.7): 0.8) * compassRad;
        const pos = polarToXY(angle, radius);
        const brightness = 1 + (6.5 - Math.max(-1.5, Math.min(6.5, star.mag)))/4; //between 1 and 2.25
        if (horizon.altitude > 0) {
          compassCode += `<circle cx="${pos.x}" cy="${pos.y}" r="${constellations[key] === highlightedConst? brightness*1.5: brightness}" fill="rgb(255, 255, ${brightness*150})"/>`;
          starPosX.push(pos.x);
          starPosY.push(pos.y);
          starName.push(star.name);
        }
        //add label in the bottom left corner of the screen
        if (!labelPos) {labelPos = pos;}
        if (pos.x > labelPos.x) {labelPos.x = pos.x + 5; labelPos.y = pos.y;}
        // if (pos.y > labelPos.y) {labelPos.y = pos.y + 5;}
      }
    }
    //add label in the code
    const hor = Astronomy.Horizon(time, observer, constellations[key].stars[0].ra, constellations[key].stars[0].dec, 'normal')
    if (labelPos && constellations[key] === shownConstLabel && hor.altitude > 0) {
      compassCode += `<text x="${labelPos.x}" y="${labelPos.y}" fill="white" font-weight="bold" font-size="15px">${constellations[key].name}</text>`
    }
  }

  //add highlighted constellations lines
  for (const abbreviation of compassConst) {
    const constallation = constellations[abbreviation];

    //Draw lines between stars
    for (const line of constallation.lines) {
      compassCode += '<polyline stroke="white" fill="none" points="'
      for (const star of line) {
        const index = starName.indexOf(star);
        if (index != -1) {
        compassCode += starPosX[index] + ", " + starPosY[index] + " " 
        }
      }
      compassCode += '"/>'
    }}

  //Add planets
  for (const body of bodies) {
    const equator = Astronomy.Equator(body, time, observer, true, true);
    const horizon = Astronomy.Horizon(time, observer, equator.ra, equator.dec, 'normal');

    const angle = horizon.azimuth;
    const radius = (horizon.altitude > 0?(horizon.altitude/90 * -0.6 + 0.7): 0.8) * compassRad; //visible planets have radius 0r - 0.6r

    const topLeft = polarToXY(angle, radius); //top left of icon
    const icon = planetIcon(body, topLeft.x, topLeft.y);
    const scale = (body === highlighted) ? 1.4 : 1;
    const centerX = topLeft.x + 12; //center of icon X
    const centerY = topLeft.y + 12; //center of icon Y
    compassCode += `<g style="opacity: ${horizon.altitude > 0? 1: 0.75};" transform="translate(${centerX} ${centerY}) scale(${scale}) translate(${-centerX} ${-centerY})">${icon}</g>`;
    compassCode += `<circle cx="${centerX}" cy="${centerY}" r="9" fill="transparent" style="cursor:pointer" data-body="${body}"/>`;  //invisible circle to press on
    //add label for planet
    if (body == shownLabel) {
      compassCode += `<text x="${centerX + 10}" y="${centerY + 10}" fill="white" font-weight="bold" font-size="15px">${body}</text>`
    }
}

  compassCode += '<style>  <![CDATA[text {dominant-baseline: hanging; font-family:"Michroma", sans-serif;}]]></style>';
  document.getElementById("compassSVG").innerHTML = compassCode;

  //CONSTELLATIONS


  function planetIcon(name, x, y) { //funtion for planet icons, icons made by Claude
    switch (name) {
      case "Mercury":
        return `
          <circle cx="${12+x}" cy="${12+y}" r="9" fill="#B8ADA0"/>
          <circle cx="${8.5+x}" cy="${9+y}" r="1.4" fill="#8C8175" opacity="0.7"/>
          <circle cx="${14+x}" cy="${14.5+y}" r="2" fill="#8C8175" opacity="0.55"/>
          <circle cx="${15.5+x}" cy="${8.5+y}" r="0.9" fill="#8C8175" opacity="0.6"/>
        `
      

      case "Venus": 
        return `
          <circle cx="${12+x}" cy="${12+y}" r="9" fill="#E8CDA0"/>
          <path d="M${4.5+x} ${10.5+y}c2.5-1.5 5-1.8 7.5-1.2s5 1.8 7.5 1"
                stroke="#C9A96A" stroke-width="1.1" fill="none" opacity="0.6"/>
          <path d="M${3.5+x} ${14+y}c2.8-1 5.6-0.8 8 0s5 1.4 8.3 0.3"
                stroke="#C9A96A" stroke-width="1.1" fill="none" opacity="0.5"/>
        `

      case "Mars":
        return `
          <circle cx="${12+x}" cy="${12+y}" r="9" fill="#C1633D"/>
          <circle cx="${9+x}" cy="${8.5+y}" r="1.6" fill="#953F22" opacity="0.55"/>
          <circle cx="${15+x}" cy="${15+y}" r="2.2" fill="#953F22" opacity="0.5"/>
          <circle cx="${12+x}" cy="${6+y}" r="1.3" fill="#E8E6DD" opacity="0.85"/>
        `
      case "Jupiter":
        return `
          <defs>
            <clipPath id="clip-jupiter">
              <circle cx="${12+x}" cy="${12+y}" r="9"/>
            </clipPath>
          </defs>
          <circle cx="${12+x}" cy="${12+y}" r="9" fill="#D8B98A"/>
          <g clip-path="url(#clip-jupiter)">
            <rect x="${3+x}" y="${7+y}" width="18" height="2.2" fill="#B8895A" opacity="0.55"/>
            <rect x="${3+x}" y="${10.5+y}" width="18" height="1.6" fill="#946B45" opacity="0.5"/>
            <rect x="${3+x}" y="${14+y}" width="18" height="2.4" fill="#B8895A" opacity="0.5"/>
            <ellipse cx="${15.5+x}" cy="${15+y}" rx="2.2" ry="1.3"
                    fill="#A85838" opacity="0.7"/>
          </g>
        `

      case "Saturn":
        return `
          <ellipse cx="${12+x}" cy="${12.5+y}" rx="10.5" ry="3.1"
                  fill="none" stroke="#C9A227" stroke-width="1.4" opacity="0.85"/>
          <circle cx="${12+x}" cy="${12+y}" r="7.2" fill="#E3D6B0"/>
          <ellipse cx="${12+x}" cy="${12.5+y}" rx="10.5" ry="3.1"
                  fill="none" stroke="#8A6F2A" stroke-width="0.6" opacity="0.4"/>
        `
      

      case "Uranus": 
        return `
          <circle cx="${12+x}" cy="${12+y}" r="9" fill="#9FD3D8"/>
          <ellipse cx="${12+x}" cy="${12+y}" rx="9" ry="2.4"
                  fill="none" stroke="#6FA8AD" stroke-width="0.9"
                  opacity="0.55" transform="rotate(-70 ${12+x} ${12+y})"/>
        `

      case "Neptune": 
        return `
          <circle cx="${12+x}" cy="${12+y}" r="9" fill="#7A9FE0"/>
          <path d="M${4+x} ${13+y}c2-2.4 5-3 8-2.4s5.4 2 8 0.6"
                stroke="#4F6FB0" stroke-width="1.1" fill="none" opacity="0.55"/>
          <circle cx="${9.5+x}" cy="${9.5+y}" r="1.5"
                  fill="#4F6FB0" opacity="0.5"/>
        `
    }
  }
}