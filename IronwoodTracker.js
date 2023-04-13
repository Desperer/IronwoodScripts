// ==UserScript==
// @name         Ironwood Tracker
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Tracks useful skilling stats in Ironwood RPG
// @author       Des
// @match        https://ironwoodrpg.com/*
// @icon         https://github.com/Desperer/IronwoodScripts/blob/main/icon/IronwoodSword.png?raw=true
// @grant        GM.setValue
// @grant        GM.getValue
// @license      MIT
// ==/UserScript==

/*
-----------------------------------------------------------------
CONFIGURATION - EDIT THESE TO YOUR LIKING!
-----------------------------------------------------------------
*/
var timeInterval = 3*1000; // Default timeInterval 3*1000 = 3 seconds, this is the time between stat box refreshes. Probably no real downside to using 2 or 1 seconds.
var soundInterval = 10*1000 // Default timeInterval 10*1000 = 10 seconds, this is the time between sound alerts when idling/inactive

//Feel free to replace the alert sound url
let rareDropSound = new Audio("https://cdn.freesound.org/previews/571/571487_7114905-lq.mp3");
let idleSound = new Audio("https://cdn.freesound.org/previews/504/504773_9961300-lq.mp3");

//alert base volume. Use a decimal like .8 for quieter alert sound
rareDropSound.volume = 1.0;
idleSound.volume = 1.0;

/*
-----------------------------------------------------------------
DO NOT EDIT BELOW! DO NOT EDIT BELOW! DO NOT EDIT BELOW!
-----------------------------------------------------------------
*/



/*
------------------------
Start UI components
------------------------
*/


//Floating box style format
let boxStyle =
    ' background: #0D2234;' +
    ' border: 2px solid #51606D;' +
    ' padding: 4px;' +
    ' border-radius: 5px;' +
    ' position: fixed;' +
    ' opacity: .6;' +
    ' float: right;' +
    ' object-fit: none;' +
    ' max-height: 200px;' +
    ' max-width: 350px;' ;

//Button style format
let buttonStyle =
    ' background: #061A2E;' +
    ' padding: 2px;' +
    ' padding-left: 6px;' +
    ' padding-right: 6px;' +
    ' font-size: 16px;' +
    ' display: inline-block;' +
    ' text-align: center;' +
    'max-height: 32px;' +
    'box-sizing: content-box;' +
    'margin: 0px;' +
    'float: left;' +
    'line-height: 1.2;' +
    'user-select: none;' +
    'max-width: 200px;' ;

//Button settings style format
let buttonSettingsStyle =
    ' background: #061A2E;' +
    ' padding: 8px;' +
    ' font-size: 16px;' +
    ' display: block;' +
    ' text-align: center;' +
    'max-height: 32px;' +
    'border: 2px solid #637A70;' +
    'border-radius: 5px;' +
    'box-sizing: content-box;' +
    'margin: 4px;' +
    'line-height: 1.2;' +
    'user-select: none;' +
    'max-width: 400px;' ;

//Box for stats
var box = document.createElement( 'div' );
document.body.appendChild( box );
box.style.cssText = boxStyle;
box.style.minWidth = '200px';
box.innerHTML = 'Click &#8634; to start tracking';
box.style.bottom = '43px';
box.style.right = '24px';
document.body.appendChild( box );

//Box for buttons
var box2 = document.createElement( 'div' );
box2.style.cssText = boxStyle;
box2.style.bottom = '4px';
box2.style.right = '24px';
document.body.appendChild( box2 );

//Box for settings
var boxSettings = document.createElement( 'div' );
boxSettings.style.cssText = boxStyle;
boxSettings.style.minWidth = '30px';
boxSettings.style.bottom = '245px';
boxSettings.style.right = '24px';

//Button to minimize tracker
var closeButton = document.createElement( 'div' );
closeButton.innerHTML = '&#9776;';
closeButton.style.cssText = buttonStyle;
box2.insertBefore( closeButton, box2.firstChild );
closeButton.addEventListener("click", function(){ hideTracker(); });

//Button to reset tracker stats
var resetButton = document.createElement( 'div' );
resetButton.innerHTML = '&#8634;';
resetButton.style.cssText = buttonStyle;
box2.insertBefore( resetButton, closeButton );
resetButton.addEventListener("click", function(){ resetTracker(); });

//Button to open settings
var settingsButton = document.createElement( 'div' );
settingsButton.innerHTML = '&#9881;';
settingsButton.style.cssText = buttonStyle;
box2.insertBefore( settingsButton, resetButton );
settingsButton.addEventListener("click", function(){ hideSettings(); });

//Button to toggle rare drop sound alerts
var rareAlertButton = document.createElement( 'div' );
rareAlertButton.title = 'Toggle repeated sound notifications when a rare item is found';
rareAlertButton.style.cssText = buttonSettingsStyle;

//Button to toggle idle sound alerts
var idleAlertButton = document.createElement( 'div' );
idleAlertButton.title = 'Toggle repeated sound notifications when your action stops';
idleAlertButton.style.cssText = buttonSettingsStyle;


/*
------------------------
End UI components
------------------------
*/



//Variables you should not change yet
var boxToggleState = true; // Default true makes the stat box display on pageload, false would keep it hidden on startup but is not yet implemented properly
var boxSettingsToggleState = false; // Default false keeps the settings page hidden on pageload, true would show settings box on startup but is not yet properly implemented
var isRunning = false; // Tracker requires manual click to start as there is not yet functionality for checking if the page is fully loaded before starting

//Local storage variables for settings
var rareAlert;
var idleAlert;

(async () => {
    rareAlert = await GM.getValue('rareAlert', false);
    idleAlert = await GM.getValue('idleAlert', false);
})();


//Messages to display
const loadingText = 'Loading...';
const startingText = 'Click &#8634; to start tracking';
const redirectText = 'Tracking progress is saved in the background.<br>Return to the tracked skill page to view details.';
const unavailableText = 'This page cannot be tracked.<br>Please try another.';

const gatherPages = ['Woodcutting', 'Mining', 'Farming', 'Fishing' ];
const craftPages = ['Smelting', 'Smithing', 'Forging', 'Alchemy', 'Cooking' ];
const combatPages = ['One-handed', 'Two-handed', 'Ranged', 'Defense' ];

const blacklistedPages = ['Inventory', 'Equipment', 'House', 'Merchant', 'Market', 'Quests', 'Leaderboards', 'Changelog',
                          'Settings', 'Discord', 'Reddit', 'Patreon', 'Rules', 'Terms of Use', 'Privacy Policy'];

const boneList = ['Bone', 'Fang', 'Medium Bone', 'Medium Fang', 'Large Bone', 'Large Fang', 'Giant Bone'];

const cardList = document.getElementsByClassName('card');

//instantiate variables for tracker
let startedTrackerBeforeSkill = false;
var hasRun = false;
var hasPlayed = false;
var notifStatus = false;
var soundStorage = 0;

const trackedSkill = {
    name: '',
    startingXp: 0,
    currentXp: 0,
    startingFood: 0,
    currentFood: 0,
    startingPots: 0,
    currentPots: 0,
    startingArrows: 0,
    currentArrows: 0,
    startingCoins: 0,
    currentCoins: 0,
    startingKills: 0,
    currentKills: 0,
    startingDrops: 0,
    currentDrops: 0,
    startTime: new Date(),

    reset: function() {
        this.name = '';
        this.startingXp = 0;
        this.currentXp = 0;
        this.startingFood = 0;
        this.currentFood = 0;
        this.startingPots = 0;
        this.currentPots = 0;
        this.startingArrows = 0;
        this.currentArrows = 0;
        this.startingCoins = 0;
        this.currentCoins = 0;
        this.startingKills = 0;
        this.currentKills = 0;
        this.startingDrops = 0;
        this.currentDrops = 0;
        this.startTime = new Date();
    }

};


function resetTracker(){ //Reset all stats in the tracker
    stopSound();
    hasPlayed = false;
    let currentSkill = getCurrentSkill();
    if (checkAllowedSkill(currentSkill)) {
        trackedSkill.reset();
        trackedSkill.name = getCurrentSkill();
        box.innerHTML = loadingText;
        isRunning = true;
        hasRun = true;
    }
    //If unallowed skill, show error message then return to inactive or loading state
    else {
        box.innerHTML = unavailableText;
        if (isRunning == true) {
            setTimeout(function() { box.innerHTML = loadingText;}, 2000);
        }

        else {
            setTimeout(function() { box.innerHTML = startingText;}, 2000);
        }
    }
}

function hideTracker(){ //minimize the tracker UI
    stopSound();
    if (boxToggleState == true) {
        box.parentNode.removeChild( box );
        boxToggleState = false;
    }
    else {
        document.body.appendChild( box );
        boxToggleState = true;
        if (isRunning == true) {
            box.innerHTML = loadingText;
        }
        else{
            box.innerHTML = startingText;
        }

    }
}


function hideSettings(){ //minimize the tracker UI
    stopSound();
    if (boxSettingsToggleState == false) {
        document.body.appendChild( boxSettings );

        if (rareAlert == true) {rareAlertButton.style.color = 'lightgreen';} else {rareAlertButton.style.color = 'red';}
        if (idleAlert == true) {idleAlertButton.style.color = 'lightgreen';} else {idleAlertButton.style.color = 'red';}
        boxSettings.innerHTML = '<h1 style=\"text-align:center;\"><b>Settings</b></h1> <hr style=\"border-color:inherit; margin: 0px -4px 8px\"></hr>';
        rareAlertButton.innerHTML = 'Rare drop sound';
        boxSettings.appendChild( rareAlertButton, boxSettings.firstChild );
        idleAlertButton.innerHTML = 'Idle sound';
        boxSettings.insertBefore( idleAlertButton, boxSettings.lastChild );
        rareAlertButton.addEventListener("click", function(){ toggleRareAlert(); });
        idleAlertButton.addEventListener("click", function(){ toggleIdleAlert(); });
        boxSettingsToggleState = true;
    }
    else{
        document.body.removeChild( boxSettings );
        boxSettingsToggleState = false;
    }
}

function toggleRareAlert(){ //toggle sound alert for rare drop
    console.log('rare');
    if (rareAlert == true) {
//        console.log('become red!');
        rareAlertButton.style.color = 'red';
        rareAlert = false;
        (async () => {await (GM.setValue('rareAlert', false)); })();
    }
    else {
//        console.log('become green!');
        rareAlertButton.style.color = 'lightgreen';
        rareAlert = true;
        (async () => {await (GM.setValue('rareAlert', true)); })();
    }
}

function toggleIdleAlert(){ //toggle sound alert for rare drop
    if (idleAlert == true) {
        idleAlertButton.style.color = 'red';
        idleAlert = false;
        (async () => {await (GM.setValue('idleAlert', false)); })();
    }
    else {
        idleAlertButton.style.color = 'lightgreen';
        idleAlert = true;
        (async () => {await (GM.setValue('idleAlert', true)); })();
    }
}




function playSound() {
    rareDropSound.play();
}

function stopSound() {
        clearInterval(soundStorage);
}

function idlePlaySound() {
    if ( document.getElementsByClassName("ring").length == 0){
        idleSound.play();
    }
}


function checkAllowedSkill (skill) { //return true if the skill is a valid skill (not blacklisted menu options)
    if (blacklistedPages.includes(skill)){
        return false;
    }
    else {
        return true;
    }
}

function getCurrentSkill() { //Return the name of the skill currently in view
    return document.getElementsByClassName('title')[0].innerText;
}


function removeCommas (string) { //Remove commas from a string and return it as a number
    return Number(string.replace(/,/g,""));
}

function groupArr(data, n) { //Split an array into a 2d array, 3 items each
    var group = [];
    for (var i = 0, j = 0; i < data.length; i++) {
        if (i >= n && i % n === 0){
            j++;
        }
        group[j] = group[j] || [];
        group[j].push(data[i])
    }
    return group;
}

function splitConsumables (list) { //Loop through a 2d array of consumables generated by groupArr(), parse necessary values, then return them properly formatted
    //console.info("splitConsumables: " + trackedSkill.name + list);
    for (let i = 0; i <= list.length-1; i++) {
        //        console.log("i" + list[i]);
        //        console.log("i0" + list[i][0]);
        if (list[i][0].includes('Potion')) {
            trackedSkill.currentPots = removeCommas(list[i][1]);
            //console.info("Set currentPots to " + trackedSkill.currentPots);
            if (trackedSkill.startingPots == 0){
                trackedSkill.startingPots = trackedSkill.currentPots;
            }
        }
        else if (list[i][2].includes('HP')) {
            trackedSkill.currentFood = removeCommas(list[i][1]);
            //console.info("Set currentFood to " + trackedSkill.currentFood);
            if (trackedSkill.startingFood == 0){
                trackedSkill.startingFood = trackedSkill.currentFood;
            }
        }
        else if (list[i][0].includes('Arrow')) {
            trackedSkill.currentArrows = removeCommas(list[i][1]);
            //console.info("Set currentArrows to " + trackedSkill.currentArrows);
            if (trackedSkill.startingArrows == 0){
                trackedSkill.startingArrows = trackedSkill.currentArrows;
            }
        }
    }
}

function parseCards(){ //Find all cards, parse necessary values, then store them properly formatted
    //console.log('parseCards: ' + trackedSkill.name);
    for (let i = 0; i < cardList.length; i++){
        //console.log(i);
        //console.log(cardList[i].innerText);
        let cardText = cardList[i].innerText.split('\n');
        //console.info(cardText);

        //Get coin count from Loot card

        let coinsFound = false;
        let bonesFound = false;

        if (cardText[0] == 'Loot'){
            for (let item = 0; item < cardText.length; item++) {
                //console.log(cardText[item]);
                if (hasPlayed == false) {
                    if (cardText[item].includes('Blueprint') || cardText[item].includes('Ring') || cardText[item].includes('Amulet') || cardText[item].includes('Rune') || cardText[item].includes('Dagger')) {
                        notifStatus = true;
                        hasPlayed = true;
                    }

                }
            }

            if (cardText[1] == 'Coins'){
                coinsFound = true;
                trackedSkill.currentCoins = removeCommas(cardText[2]);
                //console.info("Set currentCoins to " + trackedSkill.currentCoins);
                //console.info('coins: ' + currentCoins);
                if (trackedSkill.startingCoins == 0 && !startedTrackerBeforeSkill){
                    trackedSkill.startingCoins = trackedSkill.currentCoins;
                }
            }

            for (const bone of boneList) {
                const boneIndex = cardText.indexOf(bone);
                if (boneIndex > 0) {
                    bonesFound = true;
                    trackedSkill.currentKills = removeCommas(cardText[boneIndex + 1]);
                    if (trackedSkill.startingKills == 0 && !startedTrackerBeforeSkill) {
                        trackedSkill.startingKills = trackedSkill.currentKills;
                    }
                    break;
                }
            }

            if (!coinsFound && !bonesFound) {
                startedTrackerBeforeSkill = true;
            }
        }
        //Get food, arrow, potion count from Consumables card
        else if (cardText[0] == 'Consumables'){
            splitConsumables(groupArr(cardText.slice(1), 3));
            //console.info('consumables:' + consumables);

        }
        //Get skill xp from Stats card
        else if (cardText[0] == 'Stats'){
            trackedSkill.currentXp = removeCommas(cardText[cardText.length-1].slice(0, -3));
            //console.info("Set currentXp to " + trackedSkill.currentXp);
            //console.info('xp: ' + currentXp);
            if (trackedSkill.startingXp == 0){
                trackedSkill.startingXp = trackedSkill.currentXp;
            }
        }
    }
    return;
}


function trackerLoop() {
    let currentSkill = getCurrentSkill();

    if (isRunning == true && boxToggleState == true) {
        if (trackedSkill.name == currentSkill) {
            parseCards();
            box.innerHTML = displayBox("active");
        }
        else {
            box.innerHTML = displayBox("inactive");
        }

    }
    if (notifStatus == true && hasPlayed == false) {
        soundStorage = setInterval(playSound, soundInterval);
        hasPlayed = true;
    }
    if (idleAlert == true) {
        idlePlaySound();
    }
}

function timerFormat(){
    let seconds = ((Math.trunc((Date.now() - (trackedSkill.startTime))/1000)) % 60).toString().padStart(2, '0');
    let minutes = ((Math.trunc((Date.now() - (trackedSkill.startTime))/1000/60)) % 60).toString().padStart(2, '0');
    let hours = ((Math.trunc((Date.now() - (trackedSkill.startTime))/1000/60/60))).toString().padStart(2, '0');

    if (hours > 0) {
        return hours + ":" + minutes + ":" + seconds;
    }
    else {
        return minutes + ":" + seconds;
    }
}

function getIcon(skill) {
    //Account for one-handed image being named improperly
    if (skill == 'One-handed'){
        return 'attack.png';
    }
    else{
        return skill.toLowerCase() +'.png';
    }
}

function displayBox(status) {
    //console.log('displayBox: ' + trackedSkill.name);
    let currentSkill = getCurrentSkill();

    let elapsedTimeMins = ((Date.now() - trackedSkill.startTime)/1000/60); //elapsed time in minutes for calc
    let elapsedTimeHours = ((Date.now() - trackedSkill.startTime)/1000/60/60); //elapsed time in minutes for calc
    let formattedTimeMins = Math.trunc(elapsedTimeMins); //elapsed time in minutes but formatted for display
    //    console.log(trackedSkill.currentXp);
    let earnedXp = trackedSkill.currentXp - trackedSkill.startingXp;
    let xpPerMinute = Math.floor(earnedXp/elapsedTimeMins);
    let xpPerHour = Math.floor(earnedXp/elapsedTimeHours);

    let usedArrows = trackedSkill.startingArrows - trackedSkill.currentArrows;
    let arrowsPerHour = Math.floor(usedArrows/elapsedTimeHours);

    let usedFood = trackedSkill.startingFood - trackedSkill.currentFood;
    let foodPerHour = Math.floor(usedFood/elapsedTimeHours);

    let earnedCoins = trackedSkill.currentCoins - trackedSkill.startingCoins;
    let coinsPerHour = Math.floor(earnedCoins/elapsedTimeHours);

    let enemyKills = trackedSkill.currentKills - trackedSkill.startingKills;
    let killsPerHour = Math.floor(enemyKills/elapsedTimeHours);

    let usedPots = trackedSkill.startingPots - trackedSkill.currentPots;

    let boxContents = '';
    //let boxTitle = '<div style=\"text-align:left; display:inline-block;\"><b> <img style=\"width:20px; object-fit:contain; image-rendering:pixelated\" src=\"assets/misc/alchemy.png\"> ' + trackedSkill.name + '<div style="margin-left:auto">' + timerFormat() + '</div></b></div>';
    //clip-path: polygon(2px 2px, 46px 2px, 46px 46px, 2px 46px);
    let boxTitle = '<div style="display:flex">' +
        '<div><img style="height:20px; width:20px; image-rendering:crisp-edges; border-radius: 4px; border-color: white; " src="assets/misc/' + getIcon(trackedSkill.name) + '"></div>' +
        ' <div><b> &nbsp; ' + trackedSkill.name + '</b></div>' +
        '<div style="margin-left: auto;"> <b>' + timerFormat() + '</b> </div>' +
        '</div>';

    let boxDivider = '<hr style=\"border-color:inherit; margin: 0px -4px 4px\"></hr>';
    let boxXP = '<p title="Total XP earned\" style=\"color:LightGreen;">XP: ' + earnedXp.toLocaleString('en') + '<span style=\"float:right;"> (' + xpPerHour.toLocaleString('en') +'/h)</span></p>';
    let boxCoins = '<p title="Total coins earned\" style=\"color:Gold;">Coins: ' + earnedCoins.toLocaleString('en') + '<span style=\"float:right;"> (' + coinsPerHour.toLocaleString('en') +'/h)</span></p>';
    let boxKills = '<p title="Total enemies defeated &#013;Alpha monsters count as multiple kills &#013;Dungeon monsters are only tallied after completing a dungeon" style=\"color:Tomato;">Kills: ' + enemyKills.toLocaleString('en') + '<span style=\"float:right;\"> (' + killsPerHour.toLocaleString('en') +'/h)</span></p>';
    let boxFood = '<p title="Total food consumed\" style=\"color:Salmon;">Food: ' + usedFood.toLocaleString('en') + '<span style="float:right;"> (' + foodPerHour.toLocaleString('en') +'/h)</span></p>';
    let boxArrows = '<p title="Total arrows consumed\" style=\"color:Wheat;">Arrows: ' + usedArrows.toLocaleString('en') + '<span style="float:right;"> (' + arrowsPerHour.toLocaleString('en') +'/h)</span></p>';
    let boxInactiveText = '<b>' + trackedSkill.name + " - " + timerFormat() + '</b><hr>' + redirectText;
  //  let boxSkillIcon = '<img style=\"width:10px; object-fit:contain\" src="assets/misc/defense.png">'

    //        console.log(elapsedTimeMins);

    // If on correct skill page, show full details
    if (currentSkill == trackedSkill.name && isRunning == true && status == 'active') {
        boxContents += boxTitle + boxDivider + boxXP;
        if (earnedCoins > 0){
            boxContents += boxCoins;
        }
        if (enemyKills > 0){
            boxContents += boxKills;
        }
        if (usedFood > 0){
            boxContents += boxFood;
        }
        if (usedArrows > 0){
            boxContents += boxArrows;
        }
        //            '<img src="assets/misc/defense.png" width="10" height="10">' +
        //            '<b>' + trackedSkill.name + " - " + formattedTimeMins + ':' + elapsedTimeSecsTimer + '</b><hr>' +

        //        '<b>' + trackedSkill.name + " - " + timerFormat() + '</b><hr>' +
        //            'XP earned: ' + earnedXp.toLocaleString('en') + ' (' + xpPerHour.toLocaleString('en') +'/h)<br>' +
        //            'Enemy kills: ' + enemyKills.toLocaleString('en') + ' (' + killsPerHour.toLocaleString('en') +'/h)<br>' +
        //            'Coins earned: ' + earnedCoins.toLocaleString('en') + ' (' + coinsPerHour.toLocaleString('en') +'/h)<br>' +
        //           "Food used: " + usedFood.toLocaleString('en') + ' (' + foodPerHour.toLocaleString('en') +'/h)<br>' +
        //           "Arrows used: " + usedArrows.toLocaleString('en') + ' (' + arrowsPerHour.toLocaleString('en') +'/h)<br>' +
    }
    else if (status == "inactive" && isRunning == true){
        boxContents += boxTitle + boxDivider + redirectText;
    }
    return boxContents;
}

setInterval(trackerLoop, timeInterval); //Recurring stat box updater

