// ==UserScript==
// @name         Ironwood Tracker
// @namespace    http://tampermonkey.net/
// @version      0.6.8
// @description  Tracks useful skilling stats in Ironwood RPG
// @author       Des
// @match        https://ironwoodrpg.com/*
// @icon         https://github.com/Desperer/IronwoodScripts/blob/main/icon/IronwoodSword.png?raw=true
// @require      https://unpkg.com/dayjs/dayjs.min.js
// @require      https://unpkg.com/dayjs/plugin/relativeTime.js
// @require      https://unpkg.com/dayjs/plugin/duration.js
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.getValue
// @grant        GM_getResourceText
// @grant        GM_setClipboard
// @grant        GM.info
// @license      MIT
// ==/UserScript==

/*---------------------------------------------------------------------------
        CONFIGURATION - EDIT THESE TO YOUR LIKING!
---------------------------------------------------------------------------*/
//Polling intervals
var timeInterval = 2 * 1000; // Default 2*1000 = 2 seconds, this is the time between stat box refreshes. Probably no real downside to going lower but it doesn't look as nice
var soundInterval = 10 * 1000 // Default 10*1000 = 10 seconds, this is the time between sound alerts when idling/inactive

//Alert sound URLs
let rareDropSound = new Audio("https://cdn.freesound.org/previews/571/571487_7114905-lq.mp3");
let idleSound = new Audio("https://cdn.freesound.org/previews/504/504773_9961300-lq.mp3");
const houseClaimSound = new Audio('https://cdn.freesound.org/previews/415/415763_6090639-lq.mp3');

//Alert volumes
rareDropSound.volume = 1; //Default 1, Use a decimal like .8 for quieter alert sound
idleSound.volume = 1; //Default 1, Use a decimal like .8 for quieter alert sound
houseClaimSound.volume = 1; //Default 1, Use a decimal like .8 for quieter alert sound

/*---------------------------------------------------------------------------
        DO NOT EDIT BELOW! DO NOT EDIT BELOW! DO NOT EDIT BELOW!
---------------------------------------------------------------------------*/

//Variables you should not change yet
var boxToggleState = true; // Default true makes the stat box display on pageload, false would keep it hidden on startup but is not yet implemented properly
var boxSettingsToggleState = false; // Default false keeps the settings page hidden on pageload, true would show settings box on startup but is not yet properly implemented
var boxFunStuffToggleState = false;
var isRunning = false; // Tracker requires manual click to start as there is not yet functionality for checking if the page is fully loaded before starting

//Local storage variables for settings
var rareAlert;
var idleAlert;
let houseClaimAlert;

//Get settings values from local storage
(async () => {
    rareAlert = await GM.getValue('rareAlert', false);
    idleAlert = await GM.getValue('idleAlert', false);
    houseClaimAlert = await GM.getValue('houseClaimAlert', false);
    if (rareAlert == true) { rareAlertButton.className = 'trackerButton trackerButtonOn'; } else { rareAlertButton.className = 'trackerButton trackerButtonOff'; }
    if (idleAlert == true) { idleAlertButton.className = 'trackerButton trackerButtonOn'; } else { idleAlertButton.className = 'trackerButton trackerButtonOff'; }
    if (houseClaimAlert) { houseClaimAlert.className = 'trackerButton trackerButtonOn'; } else { houseClaimAlert.className = 'trackerButton trackerButtonOff'; }
})();

//Messages to display
const loadingText = 'Loading...';
const startingText = 'Click &#8634; to start tracking';
const redirectText = 'Tracking progress is saved in the background.<br>Return to the tracked skill page to view details.';
const unavailableText = 'This page cannot be tracked.<br>Please try another.';

const gatherPages = ['Woodcutting', 'Mining', 'Farming', 'Fishing'];
const craftPages = ['Smelting', 'Smithing', 'Forging', 'Alchemy', 'Cooking'];
const combatPages = ['One-handed', 'Two-handed', 'Ranged', 'Defense'];

const blacklistedPages = ['Inventory', 'Equipment', 'House', 'Merchant', 'Market', 'Quests', 'Leaderboards', 'Changelog',
    'Settings', 'Discord', 'Reddit', 'Patreon', 'Rules', 'Terms of Use', 'Privacy Policy', 'Guild'];

const boneList = ['Bone', 'Medium Bone', 'Large Bone', 'Giant Bone',
    'Fang', 'Medium Fang', 'Large Fang'];

const combatPotionList = ['Combat Potion', 'Super Combat Potion', 'Divine Combat Potion',
    'Double Attack Potion', 'Super Double Attack Potion', 'Divine Double Attack Potion',
    'Resistance Potion', 'Super Resistance Potion', 'Divine Resistance Potion'];

const gatheringPotionList = ['Gather Level Potion', 'Super Gather Level Potion', 'Divine Gather Level Potion',
    'Gather Speed Potion', 'Super Gather Speed Potion', 'Divine Gather Speed Potion',];

const craftingPotionList = ['Craft Level Potion', 'Super Craft Level Potion', 'Divine Craft Level Potion',
    'Craft Speed Potion', 'Super Craft Speed Potion', 'Divine Craft Speed Potion',
    'Preservation Potion', 'Super Preservation Potion', 'Divine Super Preservation Potion'];

const milestones = new Map([ //Level : Total XP Required
    [10, 3794],
    [25, 93750],
    [40, 485725],
    [55, 1480644],
    [70, 3443692],
    [85, 6794343],
    [100, 12000000]
]);

const cardList = document.getElementsByClassName('card');
const trackerComponent = document.getElementsByTagName("tracker-component");

//Variables used by tracker
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
    startingCombatPotions: 0,
    currentCombatPotions: 0,
    startingGatheringPotions: 0,
    currentGatheringPotions: 0,
    startingCraftingPotions: 0,
    currentCraftingPotions: 0,
    startingArrows: 0,
    currentArrows: 0,
    startingCoins: 0,
    currentCoins: 0,
    startingKills: 0,
    currentKills: 0,
    startingDrops: 0,
    currentDrops: 0,
    currentLevel: 0,
    currentLevelXP: 0,
    nextLevelXP: 0,
    startTime: new Date(),
    coinsInitialized: false,
    bonesInitialized: false,
    potsInitialized: false,

    reset: function () {
        this.name = '';
        this.startingXp = 0;
        this.currentXp = 0;
        this.startingFood = 0;
        this.currentFood = 0;
        this.startingCombatPotions = 0;
        this.currentCombatPotions = 0;
        this.startingGatheringPotions = 0;
        this.currentGatheringPotions = 0;
        this.startingCraftingPotions = 0;
        this.currentCraftingPotions = 0;
        this.startingArrows = 0;
        this.currentArrows = 0;
        this.startingCoins = 0;
        this.currentCoins = 0;
        this.startingKills = 0;
        this.currentKills = 0;
        this.startingDrops = 0;
        this.currentDrops = 0;
        this.currentLevel = 0;
        this.currentLevelXP = 0;
        this.nextLevelXP = 0;
        this.startTime = new Date();
        this.coinsInitialized = false;
        this.bonesInitialized = false;
        this.potsInitialized = false;
    }
};

//Main Flexbox
var trackerWindow = document.createElement('div');
trackerWindow.className = 'trackerWindow';
document.body.appendChild(trackerWindow);

//Dynamically create number of flexbox columns
var column = [];
for (let i = 1; i <= 3; i++) {
    column[i] = document.createElement('div');
    column[i].className = 'trackerColumn trackerColumn' + i;
}

//Show first column by default
trackerWindow.appendChild(column[1]);

//Title (header) for settings box
var titleSettingsBox = document.createElement('div');
var settingsHeaderLeft = document.createElement('div');
var settingsHeaderRight = document.createElement('div');
titleSettingsBox.className = 'trackerHeader';
settingsHeaderLeft.className = 'flexItemLeft';
settingsHeaderRight.className = 'flexItemRight';
settingsHeaderLeft.innerHTML = 'Settings'
settingsHeaderRight.innerHTML = 'v' + GM_info.script.version;
column[2].appendChild(titleSettingsBox);
titleSettingsBox.appendChild(settingsHeaderLeft);
titleSettingsBox.appendChild(settingsHeaderRight);

//Title (header) for stat box
var titleStatsBox = document.createElement('div');
var statsHeaderLeft = document.createElement('div');
var statsHeaderCenter = document.createElement('div');
var statsHeaderRight = document.createElement('div');
titleStatsBox.className = 'trackerHeader';
statsHeaderLeft.className = 'flexItemLeft trackerIcon';
statsHeaderRight.className = 'flexItemRight';
statsHeaderCenter.className = 'flexItemCenter';
column[1].appendChild(titleStatsBox);
titleStatsBox.appendChild(statsHeaderLeft);
titleStatsBox.appendChild(statsHeaderCenter);
titleStatsBox.appendChild(statsHeaderRight);

//Title (header) for history box
var titleHistoryBox = document.createElement('div');
var historyHeaderLeft = document.createElement('div');
var historyHeaderCenter = document.createElement('div');
var historyHeaderRight = document.createElement('div');
historyHeaderLeft.className = 'flexItemLeft trackerIcon';
historyHeaderRight.className = 'flexItemRight';
historyHeaderCenter.className = 'flexItemCenter';
titleHistoryBox.className = 'trackerHeader';
historyHeaderLeft.innerHTML = 'History';
column[3].appendChild(titleHistoryBox);
titleHistoryBox.appendChild(historyHeaderLeft);
titleHistoryBox.appendChild(historyHeaderCenter);
titleHistoryBox.appendChild(historyHeaderRight);

//Box for tracked stats
var trackerStatBox = document.createElement('div');
trackerStatBox.className = 'trackerStatBox';
column[1].appendChild(trackerStatBox);

//Box for messages
var messageBox = document.createElement('div');
messageBox.className = 'messageBox';
column[1].appendChild(messageBox);

//Box for history
var trackerHistoryBox = document.createElement('div');
trackerHistoryBox.className = 'trackerStatBox';
trackerHistoryBox.innterHTML = 'History';
column[3].appendChild(trackerHistoryBox);

//Button to toggle rare drop sound alerts
var rareAlertButton = document.createElement('div');
if (rareAlert == true) { rareAlertButton.className = 'trackerButton trackerButtonOn'; } else { rareAlertButton.className = 'trackerButton trackerButtonOff'; }
rareAlertButton.title = 'Toggle repeated sound notifications when a rare item is found';
rareAlertButton.innerHTML = 'Rare drop sound';
rareAlertButton.addEventListener("click", function () { toggleRareAlert(); });
column[2].append(rareAlertButton);

//Button to toggle idle sound alerts
var idleAlertButton = document.createElement('div');
if (idleAlert == true) { idleAlertButton.className = 'trackerButton trackerButtonOn'; } else { idleAlertButton.className = 'trackerButton trackerButtonOff'; }
idleAlertButton.title = 'Toggle repeated sound notifications when your action stops';
idleAlertButton.innerHTML = 'Idle sound';
idleAlertButton.addEventListener("click", function () { toggleIdleAlert(); });
column[2].append(idleAlertButton);

//Button to toggle idle sound alerts
const houseClaimAlertButton = document.createElement('div');
if (houseClaimAlert) { houseClaimAlertButton.className = 'trackerButton trackerButtonOn'; } else { houseClaimAlertButton.className = 'trackerButton trackerButtonOff'; }
houseClaimAlertButton.title = 'Toggle repeated sound notifications when house has something to claim';
houseClaimAlertButton.innerHTML = 'House claim sound';
houseClaimAlertButton.addEventListener("click", function () { toggleHouseClaimAlert(); });
column[2].append(houseClaimAlertButton);


//Title (header) for fun stuff
var titleFunStuffBox = document.createElement('div');
var funStuffHeaderLeft = document.createElement('div');
titleFunStuffBox.className = 'trackerHeader';
funStuffHeaderLeft.className = 'flexItemLeft';
funStuffHeaderLeft.innerHTML = 'Fun Stuff';
column[2].appendChild(titleFunStuffBox);
titleFunStuffBox.appendChild(funStuffHeaderLeft);

//Box for buttons
var box2 = document.createElement('div');
box2.className = "trackerNavBar";
document.body.appendChild(box2);

//Box for fun stuff
var boxFunStuff = document.createElement('div');
boxFunStuff.className = 'boxStyle boxSettings';
column[2].appendChild(boxFunStuff);

//navButton to minimize tracker
var closeButton = document.createElement('div');
closeButton.className = 'trackerNavButton';
closeButton.title = 'Minimize tracker';
closeButton.innerHTML = '&#9776;';
box2.insertBefore(closeButton, box2.firstChild);
closeButton.addEventListener("click", function () { showTracker(); });

//navButton to reset tracker stats
var resetButton = document.createElement('div');
resetButton.className = 'trackerNavButton';
resetButton.title = 'Restart tracker';
resetButton.innerHTML = '&#8634;';
box2.insertBefore(resetButton, closeButton);
resetButton.addEventListener("click", function () { resetTracker(); });

//navButton to open settings
var settingsButton = document.createElement('div');
settingsButton.className = 'trackerNavButton';
settingsButton.title = 'Open settings menu';
settingsButton.innerHTML = '&#9881;';
box2.insertBefore(settingsButton, resetButton);
settingsButton.addEventListener("click", function () { showSettings(); });

//navButton for fun stuff!
var funStuffButton = document.createElement('div');
funStuffButton.className = 'trackerNavButton';
funStuffButton.title = 'History';
funStuffButton.innerHTML = '&#9728;';

box2.insertBefore(funStuffButton, settingsButton);
funStuffButton.addEventListener("click", function () { showFunStuff(); });

//navButton for share snapshot
var shareSnapshotButton = document.createElement('div');
shareSnapshotButton.className = 'trackerButton';
shareSnapshotButton.title = 'Copy a shareable snapshot of your account progress, formatted for discord'
shareSnapshotButton.innerHTML = 'Share Stats'
shareSnapshotButton.addEventListener("click", function () { shareSnapshot(); });
column[2].appendChild(shareSnapshotButton);

//navButton for history
var saveHistoryButton = document.createElement('div');
saveHistoryButton.className = 'trackerButton';
saveHistoryButton.title = 'Manually save current stat window in history panel. Also saved automatically when clicking reset';
saveHistoryButton.innerHTML = 'Save History';
saveHistoryButton.addEventListener("click", function () { saveTrackerHistory(); });
column[2].appendChild(saveHistoryButton);

function resetTracker() { //Reset all stats in the tracker
    saveTrackerHistory(); //Save current stat box to history
    trackerStatBox.innerHTML = ''; //Clear stat box content immediately
    messageBox.innerHTML = '';
    stopSound();
    hasPlayed = false;
    let currentSkill = getCurrentSkill();
    if (checkAllowedSkill(currentSkill)) {
        trackedSkill.reset();
        trackedSkill.name = getCurrentSkill();
        initializeCards();
        messageBox.innerHTML = loadingText;
        isRunning = true;
        hasRun = true;
    }
    //If unallowed skill, show error message then return to inactive or loading state
    else {
        messageBox.innerHTML = unavailableText;
        if (isRunning == true) {
            setTimeout(function () { showMessage(loadingText); }, 2000);
        }

        else {
            setTimeout(function () { showMessage(startingText); }, 2000);
        }
    }
}

function showTracker() { //minimize the tracker UI
    stopSound();
    if (boxToggleState == true) {
        document.body.removeChild(trackerWindow);
        boxToggleState = false;
    }
    else {
        document.body.appendChild(trackerWindow);
        boxToggleState = true;
    }
}


function showSettings() { //toggle showing column2
    stopSound();
    if (boxSettingsToggleState == false) {
        trackerWindow.appendChild(column[2]);
        boxSettingsToggleState = true;
    }
    else {
        trackerWindow.removeChild(column[2]);
        boxSettingsToggleState = false;
    }
}

function showFunStuff() { //toggle showing column3
    stopSound();
    if (boxFunStuffToggleState == false) {
        trackerWindow.appendChild(column[3]);
        boxFunStuffToggleState = true;
    }
    else {
        trackerWindow.removeChild(column[3]);
        boxFunStuffToggleState = false;
    }
}

function toggleRareAlert() { //toggle sound alert for rare drop
    if (rareAlert == true) {
        //        console.log('become red!');
        rareAlertButton.className = 'trackerButton trackerButtonOff';
        rareAlert = false;
        (async () => { await (GM.setValue('rareAlert', false)); })();
    }
    else {
        //        console.log('become green!');
        rareAlertButton.className = 'trackerButton trackerButtonOn';
        rareAlert = true;
        (async () => { await (GM.setValue('rareAlert', true)); })();
    }
}

function toggleIdleAlert() { //toggle sound alert for rare drop
    if (idleAlert == true) {
        idleAlertButton.className = 'trackerButton trackerButtonOff';
        idleAlert = false;
        (async () => { await (GM.setValue('idleAlert', false)); })();
    }
    else {
        idleAlertButton.className = 'trackerButton trackerButtonOn';
        idleAlert = true;
        (async () => { await (GM.setValue('idleAlert', true)); })();
    }
}

function toggleHouseClaimAlert() { //toggle sound alert for rare drop
    if (houseClaimAlert) {
        houseClaimAlertButton.className = 'trackerButton trackerButtonOff';
        houseClaimAlert = false;
        (async () => { await (GM.setValue('houseClaimAlert', false)); })();
    }
    else {
        houseClaimAlertButton.className = 'trackerButton trackerButtonOn';
        houseClaimAlert = true;
        (async () => { await (GM.setValue('houseClaimAlert', true)); })();
    }
}

function playSound() {
    rareDropSound.play();
}

function stopSound() {
    clearInterval(soundStorage);
}

function idlePlaySound() {
    if (document.getElementsByClassName("ring").length == 0) {
        idleSound.play();
    }
}

function houseClaimPlaySound() {
    const primaryElements = document.getElementsByClassName("primary");
    if (primaryElements.length > 0) {
        for (const element of primaryElements) {
            if (element.innerText == 'Claim') {
                houseClaimSound.play();
                return;
            }
        }
    }
}

function shareSnapshot() { //Copy formatted list of skill levels to clipboard
    let skillsList = document.getElementsByClassName('scroll custom-scrollbar scroll-margin')[0].childNodes;
    let skillTemp = '';
    let skillOutput = '';
    console.log(skillsList.length);
    console.log(skillsList[9].innerText);
    for (let i = 0; i < (skillsList.length - 13); i++) {
        console.log(skillsList[i].innerText);
        if (skillsList[i].innerText.includes('Lv.')) {
            skillOutput += '> ' + skillsList[i].innerText.replace(/[\n\r]+/g, ' ') + '\n';
        }
    }
    console.log(skillOutput);
    GM_setClipboard(skillOutput, "text");
}

function showMessage(text) {
    messageBox.innerHTML = text;
}

function checkAllowedSkill(skill) { //return true if the skill is a valid skill (not blacklisted menu options)
    if (blacklistedPages.includes(skill)) {
        return false;
    }
    else {
        return true;
    }
}

function getCurrentSkill() { //Return the name of the skill currently in view
    return document.getElementsByClassName('title')[0].innerText;
}

function removeCommas(string) { //Remove commas from a string and return it as a number
    return Number(string.replace(/,/g, ""));
}

function groupArr(data, n) { //Split an array into a 2d array, 3 items each
    var group = [];
    for (var i = 0, j = 0; i < data.length; i++) {
        if (i >= n && i % n === 0) {
            j++;
        }
        group[j] = group[j] || [];
        group[j].push(data[i])
    }
    return group;
}

function splitConsumables(list) { //Loop through a 2d array of consumables generated by groupArr(), parse necessary values, then return them properly formatted
    //console.info("splitConsumables: " + trackedSkill.name + list);

    for (let i = 0; i < list.length - 1; i++) {
        //        console.log("i" + list[i]);
        //        console.log("i0" + list[i][0]);
        if (combatPotionList.indexOf(list[i][0]) > 0) {
            trackedSkill.currentCombatPotions = removeCommas(list[i][1]);
            if (trackedSkill.startingCombatPotions == 0) {
                trackedSkill.startingCombatPotions = trackedSkill.currentCombatPotions
            }
        }
        if (gatheringPotionList.indexOf(list[i][0]) > 0) {
            trackedSkill.currentGatheringPotions = removeCommas(list[i][1]);
            if (trackedSkill.startingGatheringPotions == 0) {
                trackedSkill.startingGatheringPotions = trackedSkill.currentGatheringPotions
            }
        }
        if (craftingPotionList.indexOf(list[i][0]) > 0) {
            trackedSkill.currentCraftingPotions = removeCommas(list[i][1]);
            if (trackedSkill.startingCraftingPotions == 0) {
                trackedSkill.startingCraftingPotions = trackedSkill.currentCraftingPotions
            }
        }
        if (list[i][2].includes('HP')) {
            trackedSkill.currentFood = removeCommas(list[i][1]);
            //console.info("Set currentFood to " + trackedSkill.currentFood);
            if (trackedSkill.startingFood == 0) {
                trackedSkill.startingFood = trackedSkill.currentFood;
            }
        }
        if (list[i][0].includes('Arrow')) {
            trackedSkill.currentArrows = removeCommas(list[i][1]);
            //console.info("Set currentArrows to " + trackedSkill.currentArrows);
            if (trackedSkill.startingArrows == 0) {
                trackedSkill.startingArrows = trackedSkill.currentArrows;
            }
        }
    }
}

function parseTrackerComponent() { //Parse the tracker component for current xp progress
    let values = trackerComponent[0].innerText.split('\n');
    let progress = values[values.length - 1];
    if (progress.includes(' / ')) { //Check if skill is max level
    progress = progress.split(' / ');
    trackedSkill.nextLevelXP = removeCommas(progress[1].slice(0, -3)); 
    }
    else {
        progress = [progress, 0];
        trackedSkill.nextLevelXP = 0;
    }
    //console.log(values);
    //console.log(progress);
    trackedSkill.currentLevel = values[1].split(' / ')[0].slice(4,7).trim();
    trackedSkill.currentLevelXP = removeCommas(progress[0]);

    //console.log(trackedSkill.currentLevelXP, trackedSkill.nextLevelXP);

}

function initializeCards() {
    for (let i = 0; i < cardList.length; i++) {
        let cardText = cardList[i].innerText.split('\n');

        if (cardText[0] == 'Loot') { //If loot card, loop through all items and record coins/kills

            for (let j = 0; j < cardText.length; j++) {
                if (cardText[j] == 'Coins') { //Get starting coins
                    trackedSkill.currentCoins = removeCommas(cardText[j + 1]);
                    trackedSkill.startingCoins = trackedSkill.currentCoins;
                    //console.log('initial coins', trackedSkill.startingCoins, trackedSkill.currentCoins);
                }
                if (cardText[j].includes('Bone') || cardText[j].includes('Fang')) { //Get starting kills
                    trackedSkill.currentKills = removeCommas(cardText[j + 1]);
                    trackedSkill.startingKills = trackedSkill.currentKills;
                    //console.log('initial kills', trackedSkill.startingKills, trackedSkill.currentKills);
                }
            }
        }
        //Get food, arrow, potion count from Consumables card
        if (cardText[0] == 'Consumables') {
            splitConsumables(groupArr(cardText.slice(1), 3));
        }
        //Get skill xp from Stats card
        if (cardText[0] == 'Stats') {
            trackedSkill.currentXp = removeCommas(cardText[cardText.length - 1].slice(0, -3));
            trackedSkill.startingXp = trackedSkill.currentXp;
        }
    }
}

function parseCards() { //Find all cards, parse necessary values, then store them properly formatted
    //console.log('parseCards: ' + trackedSkill.name);
    for (let i = 0; i < cardList.length; i++) {
        let cardText = cardList[i].innerText.split('\n');

        if (cardText[0] == 'Loot') { //If loot card, loop through all items and record coins/kills
            for (let j = 0; j < cardText.length; j++) {
                if (cardText[j] == 'Coins') { //Get starting coins
                    trackedSkill.currentCoins = removeCommas(cardText[j + 1]);
                }
                if (cardText[j].includes('Bone') || cardText[j].includes('Fang')) { //Get starting kills
                    trackedSkill.currentKills = removeCommas(cardText[j + 1]);
                }
                if (hasPlayed == false) {
                    if (cardText[j].includes('Blueprint') || cardText[j].includes('Ring') || cardText[j].includes('Amulet') || cardText[j].includes('Rune') || cardText[j].includes('Dagger')) {
                        notifStatus = true;
                        hasPlayed = true;
                    }
                }
            }
        }
        //Get food, arrow, potion count from Consumables card
        if (cardText[0] == 'Consumables') {
            splitConsumables(groupArr(cardText.slice(1), 3));
            //console.info('consumables:' + consumables);
        }
        //Get skill xp from Stats card
        if (cardText[0] == 'Stats') {
            trackedSkill.currentXp = removeCommas(cardText[cardText.length - 1].slice(0, -3));
            //console.info("Set currentXp to " + trackedSkill.currentXp);
            //console.info('xp: ' + currentXp);
        }
    }
}

function trackerLoop() {
    let currentSkill = getCurrentSkill();

    if (isRunning == true && boxToggleState == true) {
        if (trackedSkill.name == currentSkill) {
            parseTrackerComponent();
            parseCards();
            displayBox("active");
            showMessage('');
        }
        else {
            displayBox("inactive");
            trackerStatBox.innerHTML = '';
            //messageBox.innerHTML = redirectText;
        }

    }
    if (notifStatus == true && hasPlayed == false) {
        soundStorage = setInterval(playSound, soundInterval);
        hasPlayed = true;
    }
    if (idleAlert == true) {
        idlePlaySound();
    }
    if (houseClaimAlert) houseClaimPlaySound();
}

function timerFormat(startTime, endTime) { //Return time between two dates in readable format
    let seconds = ((Math.trunc((endTime - startTime) / 1000)) % 60).toString().padStart(2, '0');
    let minutes = ((Math.trunc((endTime - startTime) / 1000 / 60)) % 60).toString().padStart(2, '0');
    let hours = ((Math.trunc((endTime - startTime) / 1000 / 60 / 60)) % 24).toString().padStart(2, '0');
    let days = ((Math.trunc((endTime - startTime) / 1000 / 60 / 60 / 24))).toString();

    if (days > 0) {
        return days + ':' + hours + ':' + minutes + ':' + seconds;
    }
    else if (hours > 0) {
        return hours + ':' + minutes + ':' + seconds;
    }
    else {
        return minutes + ':' + seconds;
    }
}

function determineTimer(durationTimer) {
    if (durationTimer >= 3600000) { //3600000ms = 1 hour
        return dayjs.duration(durationTimer).format('HH:mm:ss');
    }

    if (durationTimer >= 3600000) { //86400000ms = 1 day
        return dayjs.duration(durationTimer).format('D:HH:mm:ss');
    }
    return dayjs.duration(durationTimer).format('mm:ss');
}

function getIcon(skill) {
    //Account for one-handed image being named improperly
    if (skill == 'One-handed') {
        return 'attack.png';
    }
    else {
        return skill.toLowerCase() + '.png';
    }
}

function calcMilestone(givenLevel) { //Based on given level, return the next milestone level's total xp requirement
    for (const [level, xp] of milestones) {
        if (givenLevel < level) {
            return [level, xp];
        }
    }
    return [0,0]; //if no milestone found
}

function saveTrackerHistory() {
    historyHeaderCenter.innerHTML = statsHeaderCenter.innerHTML;
    historyHeaderRight.innerHTML = statsHeaderRight.innerHTML;
    trackerHistoryBox.innerHTML = trackerStatBox.innerHTML;
}

function displayBox(status) {
    //console.log('displayBox: ' + trackedSkill.name);
    let currentSkill = getCurrentSkill();

    let elapsedTimeMs = Math.abs(Date.now() - trackedSkill.startTime); //elapsed time in ms for calc
    //console.log('elapsed time sec ', elapsedTimeMs / 1000);
    let elapsedTimeMins = elapsedTimeMs / 1000 / 60; //elapsed time in minutes for calc
    let elapsedTimeHours = elapsedTimeMs / 1000 / 60 / 60; //elapsed time in hours for calc
    let formattedTimeMins = Math.trunc(elapsedTimeMins); //elapsed time in minutes but formatted for display
    //    console.log(trackedSkill.currentXp);
    let earnedXp = trackedSkill.currentXp - trackedSkill.startingXp;
    let xpPerMinute = Math.floor(earnedXp / elapsedTimeMins);
    let xpPerHour = Math.floor(earnedXp / elapsedTimeHours);
    let xpPerMs = earnedXp / elapsedTimeMs;
    //console.log(xpPerMs);

    let usedArrows = trackedSkill.startingArrows - trackedSkill.currentArrows;
    let arrowsPerHour = Math.floor(usedArrows / elapsedTimeHours);

    let usedFood = trackedSkill.startingFood - trackedSkill.currentFood;
    let foodPerHour = Math.floor(usedFood / elapsedTimeHours);

    let earnedCoins = trackedSkill.currentCoins - trackedSkill.startingCoins;
    let coinsPerHour = Math.floor(earnedCoins / elapsedTimeHours);

    let enemyKills = trackedSkill.currentKills - trackedSkill.startingKills;
    let killsPerHour = Math.floor(enemyKills / elapsedTimeHours);

    const usedCombatPotions = trackedSkill.startingCombatPotions - trackedSkill.currentCombatPotions;
    const combatPotionsPerHour = Math.floor(usedCombatPotions / elapsedTimeHours);

    const usedGatheringPotions = trackedSkill.startingGatheringPotions - trackedSkill.currentGatheringPotions;
    const gatheringPotionsPerHour = Math.floor(usedGatheringPotions / elapsedTimeHours);

    const usedCraftingPotions = trackedSkill.startingCraftingPotions - trackedSkill.currentCraftingPotions;
    const craftingPotionsPerHour = Math.floor(usedCraftingPotions / elapsedTimeHours);

    let requiredXP = 0;
    let estimatedLevelTime = 0;
    if (trackedSkill.nextLevelXP > 0) {
    requiredXP = trackedSkill.nextLevelXP - trackedSkill.currentLevelXP;
    estimatedLevelTime = requiredXP / xpPerMs;
    }
    let requiredXpMilestone = 0;
    let estimatedMilestoneTime = 0;
    let milestoneLevel = calcMilestone(trackedSkill.currentLevel); //[Level, Total XP]
    //console.log(milestoneLevel)
    if (milestoneLevel[0] > 0) { //Check if a milestone level was found
        requiredXpMilestone = milestoneLevel[1] - trackedSkill.currentXp;
        estimatedMilestoneTime = requiredXpMilestone / xpPerMs;
    }
    //console.log('requirexpmilestone: ', requiredXpMilestone, 'currentXp:', trackedSkill.currentXp,  )
    //console.log('estimated milestone time: ', estimatedMilestoneTime/1000)
    //console.log((Date.now + estimatedLevelTime));
    //(trackedSkill.currentLevel) - trackedSkill.currentXp);
    //console.log(Date.now(), (Date.now() + estimatedLevelTime));

    let boxContents = '';

    let boxDivider = '<hr style="border-color:gray;"></hr>';
    let boxXP = '<p class="trackerStatXP" title="Total XP earned" style="color:LightGreen;"><span>XP: ' + earnedXp.toLocaleString('en') + '<span class="trackerStatRight"> &#013;(' + xpPerHour.toLocaleString('en') + '/h)</span></p>';
    let boxCoins = '<p class="trackerStatCoins" title="Total coins earned">Coins: ' + earnedCoins.toLocaleString('en') + '<span class="trackerStatRight"> &#013;(' + coinsPerHour.toLocaleString('en') + '/h)</span></p>';
    let boxKills = '<p class="trackerStatKills" title="Total enemies defeated &#013;Alpha monsters count as multiple kills &#013;Dungeon monsters are only tallied after completing a dungeon">Kills: ' + enemyKills.toLocaleString('en') + '<span class="trackerStatRight"> &#013;(' + killsPerHour.toLocaleString('en') + '/h)</span></p>';
    let boxFood = '<p class="trackerStatFood" title="Total food consumed">Food: ' + usedFood.toLocaleString('en') + '<span class="trackerStatRight"> &#013;(' + foodPerHour.toLocaleString('en') + '/h)</span></p>';
    let boxArrows = '<p class="trackerStatArrows" title="Total arrows consumed\">Arrows: ' + usedArrows.toLocaleString('en') + '<span class="trackerStatRight"> &#013;(' + arrowsPerHour.toLocaleString('en') + '/h)</span></p>';

    const boxCombatPotions = '<p class="trackerStatCombatPots" title="Total combat potions consumed">Combat Pots: ' + usedCombatPotions.toLocaleString('en') + '<span class="trackerStatRight"> (' + combatPotionsPerHour.toLocaleString('en') + '/h)</span></p>';
    const boxGatheringPotions = '<p class="trackerStatGatheringPots" title="Total gathering potions consumed\">Gathering Pots: ' + usedGatheringPotions.toLocaleString('en') + '<span class="trackerStatRight"> (' + gatheringPotionsPerHour.toLocaleString('en') + '/h)</span></p>';
    const boxCraftingPotions = '<p class="trackerStatCraftingPots" title="Total crafting potions consumed">Crafting Pots: ' + usedCraftingPotions.toLocaleString('en') + '<span class="trackerStatRight"> (' + craftingPotionsPerHour.toLocaleString('en') + '/h)</span></p>';

    let boxNextLevel = '<p class="trackerStatMilestone" title="Estimated time until next level" style="border-top: 1px solid gray"> Level up ' + dayjs((Date.now() - estimatedLevelTime)).toNow() + '</p>';
    let boxNextMilestone = '<p class="trackerStatMilestone" title="Estimated time until next milestone level"> Tier up ' + dayjs((Date.now() - estimatedMilestoneTime)).toNow() + '</p>';

    let boxInactiveText = '<b>' + trackedSkill.name + " - " + timerFormat(trackedSkill.startTime, Date.now()) + '</b><hr>' + redirectText;

    // If on correct skill page, show full details
    if (currentSkill == trackedSkill.name && isRunning == true && status == 'active') {
        if (earnedXp > 0) {
            boxContents += boxXP;
        }
        if (earnedCoins > 0) {
            boxContents += boxCoins;
        }
        if (enemyKills > 0) {
            boxContents += boxKills;
        }
        if (usedFood > 0) {
            boxContents += boxFood;
        }
        if (usedCombatPotions > 0) {
            boxContents += boxCombatPotions;
        }
        if (usedGatheringPotions > 0) {
            boxContents += boxGatheringPotions;
        }
        if (usedCraftingPotions > 0) {
            boxContents += boxCraftingPotions;
        }
        if (usedArrows > 0) {
            boxContents += boxArrows;
        }
        if (earnedXp > 0 && trackedSkill.currentLevel < 100) {
            //           boxContents += boxNextLevel;
            boxContents += boxNextLevel;
            //console.log(milestoneLevel[0]);
            //console.log(trackedSkill.currentLevel);
            if ((milestoneLevel[0] - 1) != trackedSkill.currentLevel) { //Don't display milestone progress if next tier is only 1 level away
                boxContents += boxNextMilestone;
            }
        }
        statsHeaderLeft.innerHTML = '<img src="assets/misc/' + getIcon(trackedSkill.name) + '">';
        statsHeaderCenter.innerHTML = '&nbsp; ' + trackedSkill.name;
        statsHeaderRight.innerHTML = determineTimer((Date.now() - trackedSkill.startTime));
        trackerStatBox.innerHTML = boxContents;
    }
    statsHeaderLeft.innerHTML = '<img style="vertical-align: middle; width: 24px; height: 24px; image-rendering: pixelated" src="assets/misc/' + getIcon(trackedSkill.name) + '">';
    statsHeaderCenter.innerHTML = trackedSkill.name;
    statsHeaderRight.innerHTML = determineTimer((Date.now() - trackedSkill.startTime));
    //return [boxTitle, ''] //return only title if inactive
}

dayjs.extend(window.dayjs_plugin_relativeTime);
dayjs.extend(window.dayjs_plugin_duration);

showMessage(startingText);
setInterval(trackerLoop, timeInterval); //Recurring stat box updater

/*------------------------
UI Components Below
------------------------*/

const styles = `
.trackerNavBar { 
    bottom: 4px;
    right: 24px;
    background: #0D2234; 
    border: 2px solid #51606D;
    padding: 4px; 
    opacity: .7;
    border-radius: 5px;
    position: fixed;
    display: flex;
}
.trackerNavButton { 
    padding-left: 4px;
    padding-right: 4px;
    line-height: 1;
    user-select: none;
}
.trackerWindow {
    background: #0D2234;
    opacity: .7;
    border: 2px solid #51606D;
    border-radius: 5px;
    position: fixed;
    bottom: 42px;
    right: 24px;
    min-height: 10px;
    min-width: 100px;
    max-width: 1000px;
    max-height: 1000px;
    display: inline-flex;
}    
.trackerColumn { 
    max-width: 500px;
    max-height: 500px;
    flex-direction: column;
    margin: 6px;
    display: flex;
}
.trackerHeader {
    user-select: none;
    display: flex;
    border-bottom: 1px solid gray; 
    margin: 4px;
}
.trackerButton {
    text-align: center;
    user-select: none;
    border: 1px solid gray; 
    border-radius: 5px;
    margin: 4px;
    padding: 0px 4px
}
.trackerStatBox {
    order: 2;
}
.trackerStatRight {
    float:right;
}
.trackerStatMilestone {
    color: CornflowerBlue;
    text-align:center;  
}
.trackerStatXP {
    color: LightGreen;
}
.trackerStatCoins {
    color: Gold;
}
.trackerStatKills {
    color: Tomato;
}
.trackerStatFood {
    color: Salmon;
}
.trackerStatCombatPots {
    color: Orange;
}
.trackerStatGatheringPots {
    color: Pink;
}
.trackerStatCraftingPots {
    color: LightBlue;
}
.trackerStatArrows {
    color: Wheat;
}
.boxStyle {
    background: #0D2234;
    flex: content;
    min-width: 0px;
    min-height: 0px;
    vertical-align: middle;
}
.trackerButtonOn {
    color:lightgreen;
}
.trackerButtonOff {
    color:salmon;
}
.trackerIcon{
    height: 24px; 
    image-rendering: pixelated;
    margin: -4px 4px 0px;
} 
.boxFunStuff {
    order: 3;
}
.messageBox {
    order: 3;
    text-align: center;
}
.titleBox {
    display:flex; 
    min-width: 150px; 
    min-height: 24px;
    align-items: baseline; 
    border-bottom: 1px solid gray; 
    flex: 1; 
    margin: 2px;
}
.boxSettings {
    order: 2;
}
.titleFunStuffBox {
    order: 1;
}
.titleSettingsBox{
}
.flexItemLeft{
}
.flexItemRight{
    flex: 1;
    text-align: right;  
}
.flexItemCenter{
    text-align: center;  
}
.trackerColumn1 { 
    order: 3;
    min-width: 200px;
}
.trackerColumn2 { 
    order: 2;
}
.trackerColumn3 { 
    order: 1;
    min-width: 200px;
}
`
//Create stylesheet
var styleSheet = document.createElement("style")
styleSheet.innerText = styles
document.head.appendChild(styleSheet)
