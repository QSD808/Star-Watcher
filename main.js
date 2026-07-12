import * as SunCalc from 'https://cdn.jsdelivr.net/npm/suncalc/+esm' //library used for moon allumination

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
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&hourly=cloud_cover&models=ecmwf_ifs&forecast_days=1`)
  const myJson = await response.json();
  const date1 = new Date();
  for (let i = 0; i < myJson.hourly.time.length; i++) {
    const date2 = new Date(myJson.hourly.time[i])
    
    if ((date1.getTime() - date2.getTime()) < 3600000 && (date1.getTime() - date2.getTime()) > 0) {
        return myJson.hourly.cloud_cover[i];
    }
  }
}

//function that returns the moon brightness using the Suncalc library
function getMoonLight() {
  const {fraction} = SunCalc.getMoonIllumination(new Date())
  return fraction
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

//2 buttons
document.getElementById('scoreBtn').addEventListener('click', displayScore);
document.getElementById('scoreInfoBtn').addEventListener('click', displayScoreInfo);





