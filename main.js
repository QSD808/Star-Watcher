import * as SunCalc from 'https://cdn.jsdelivr.net/npm/suncalc/+esm' // library used for moon illumination calculations


//functions to hide and show elements
function hideElement(elementId) {
    const element = document.getElementById(elementId);
    element.style.display = 'none';
}

function showElement(elementId) {
    const element = document.getElementById(elementId);
    element.style.display = 'inline-block'; 
}

//function that uses the open meteo api to return the cloudcover at this time in percent
const getClouds = async (lat, long) => {
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&hourly=cloud_cover&models=ecmwf_ifs&forecast_days=1`);
  const myJson = await response.json();
  const date1 = new Date();

  for (let i = 0; i < myJson.hourly.time.length; i++) {
    const date2 = new Date(myJson.hourly.time[i]);
    if ((date1.getTime() - date2.getTime()) < 3600000 && (date1.getTime() - date2.getTime()) > 0) {
        return myJson.hourly.cloud_cover[i];
    }
  }
}

//function that returns the moon brightness using the Suncalc library
function getMoonLight() {
  const { fraction } = SunCalc.getMoonIllumination(new Date());
  return fraction;
}

//options for the location function
const options = {
  enableHighAccuracy: true,
  timeout: 5000,
};

//function that returns the current positions of the user
function getPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position);
      },
      (error) => {
        console.log(error.message);
        reject(error);
      },
      options
    );
  });
}

//functuion that calculates the score for stargazing
async function calculateScore() {
  //define variables
  const pos = await getPosition()
  const cloudLevel = await getClouds(pos.coords.latitude, pos.coords.longitude)
  const moonLight = await getMoonLight()
  const times = SunCalc.getTimes(new Date(), pos.coords.latitude , pos.coords.longitude)

  //calculate score
  const cloudScore = 1 - (cloudLevel/100);
  const moonScore = 1 - (moonLight)
  let score = cloudScore * moonScore * 10

  return [times, cloudScore - 0.01, moonScore - 0.01, score];
  }

//displays the score to the user
async function displayScore() {
  const [times, cloudScore, moonScore, score] = await calculateScore();
  hideElement("scoreBtn");
  showElement("score-wrapper");
  document.getElementById("score").innerHTML = Math.round(score*10)/10 + "/10";
}

//Shows extra information about the score
async function displayScoreInfo() {
  const [times, cloudScore, moonScore, score] = await calculateScore();

  //Show extra information
  const element = document.getElementById("scoreInfo");
  element.style.display = 'block';

  document.getElementById("cloudScore").innerHTML = "Cloudscore: " + Math.round(cloudScore*100)/10 + "/10";
  document.getElementById("moonScore").innerHTML = "Moonscore: " + Math.round(moonScore*100)/10 + "/10";

  const p = document.getElementById("timeScore");
  if (times.night === null) {p.innerHTML = "Time: There is no astronomical night at you location today";}
  else if (times.night.getTime() > (new Date()).getTime()) {p.innerHTML = "Time: Wait for the night at " + times.night.toTimeString();}
  else {p.innerHTML = "Time: It's night";}
}

// Attach click listeners for score display and info expansion.
document.getElementById('scoreBtn').addEventListener('click', displayScore);
document.getElementById('scoreInfoBtn').addEventListener('click', displayScoreInfo);



// -----------------------------------------------------------------------------
// Forecast graph setup
// -----------------------------------------------------------------------------

// Arrays to store forecast labels and score values for the chart.
const xValues = [];
const cloudValues = [];
const moonValues = [];
const scoreValues = [];

const pos = await getPosition(); //Get position for next step
const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&hourly=cloud_cover&models=ecmwf_ifs&forecast_days=3`) //get the cloud forecast for the next 3 days
const myJson = await response.json();
const date1 = new Date();

//get data for graph
  for (let i = 0; i < myJson.hourly.time.length; i++) {
    const date2 = new Date(myJson.hourly.time[i])
    
    if (date1.getTime() < date2.getTime()) {
        xValues.push(date2.getDate() + "/" + date2.getMonth() + " " + date2.getHours() + ":00"); //Xvalue label
        cloudValues.push((100 - myJson.hourly.cloud_cover[i])/10); //cloudscore
        const {fraction} = SunCalc.getMoonIllumination(date2); //Moonscore
        moonValues.push((1-fraction)*10);
        scoreValues.push((100 - myJson.hourly.cloud_cover[i])/100 * (1-fraction) * 10); //Actual score
    }
  }


//Draw graph using chart.JS
const graphCtx = document.getElementById('futureGraph');

new Chart(graphCtx, {
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
      label: 'Future score',
      data: scoreValues,
      borderColor: "#E9E8ED",
      pointRadius: 2,
      tension: 0.4,
    },]
  },
  options: {
    plugins: {
      legend: { 
        display: true,
        // labels: {}
       },
      title: {
        display: true,
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

  const count = Math.min(Math.floor((w * h) / 3000), 500);

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
