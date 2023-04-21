// ==UserScript==
// @name         Ironwood Tracker
// @namespace    http://tampermonkey.net/
// @version      0.6.0
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
// @grant        GM_setClipboard
// @grant        GM.info
// @license      MIT
// ==/UserScript==

/*
-----------------------------------------------------------------
CONFIGURATION - EDIT THESE TO YOUR LIKING!
-----------------------------------------------------------------
*/
var timeInterval = 2 * 1000; // Default timeInterval 3*1000 = 3 seconds, this is the time between stat box refreshes. Probably no real downside to going lower
var soundInterval = 10 * 1000 // Default timeInterval 10*1000 = 10 seconds, this is the time between sound alerts when idling/inactive

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
let flexboxStyle =
    ' background: #0D2234;' +
    ' opacity: .7;' +
    ' border: 2px solid #51606D;' +
    ' border-radius: 5px;' +
    ' position: fixed;' +
    ' bottom: 42px;' +
    ' right: 24px;' +
    ' min-height: 10px;' +
    ' min-width: 100px;' +
    ' max-width: 1000px;' +
    ' max-height: 1000px;' +
    ' justify-content: space-evenly;' +
    ' display: inline-flex';

//Flexbox columns format
let flexboxColumnStyle = 
    ' padding: 0px 6px;' +
    ' max-width: 500px;' +
    ' max-height: 500px;' +
    ' min-width: 230px;' +
   ' flex-direction: column;' +
   ' align-content: flex-start;' +
   ' margin: 0px 4px;' +
    ' display: flex';

//Floating box style format
let boxStyle =
    ' background: #0D2234;' +
    ' flex: content;' +
    ' min-width: 0px;' +
    ' min-height: 0px;' +
    ' vertical-align: middle;';

//Button box format
let settingsStyle =     
    ' background: #0D2234;' +
    ' border: 2px solid #51606D;' +
    ' padding: 4px;' +
    ' opacity: .7;' +
    ' border-radius: 5px;' +
    ' position: fixed;' +
    ' opacity: .7;' +
    ' float: right;' +
    ' object-fit: none;' +
    ' max-height: 400px;' +
    ' max-width: 350px;';

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
    'max-width: 200px;';

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
    'max-width: 400px;';

//Main Flexbox
var mainFlexbox = document.createElement('div');
mainFlexbox.style.cssText = flexboxStyle;
document.body.appendChild(mainFlexbox);

//Flexbox Columns
var column1 = document.createElement('div');
var column2 = document.createElement('div');
var column3 = document.createElement('div');
column1.style.cssText = flexboxColumnStyle;
column2.style.cssText = flexboxColumnStyle;
column1.style.order = '3';
column2.style.order = '2';
column3.style.order = '1';
mainFlexbox.appendChild(column1);

//Box for stats
var box = document.createElement('div');
box.style.cssText = boxStyle;
box.style.order = "2";
column1.appendChild(box);

//Box for messages
var messageBox = document.createElement('div');
messageBox.style.cssText = boxStyle;
messageBox.style.order = '3';
column1.appendChild(messageBox);

//Box for stats title
var titleBox = document.createElement('div');
titleBox.style.cssText = boxStyle;
titleBox.style.order = '1';
column1.appendChild(titleBox);

//Box for settings title
var titleSettingsBox = document.createElement('div');
titleSettingsBox.style.cssText = boxStyle;
titleSettingsBox.style.order = '1';
column2.appendChild(titleSettingsBox);

//Box for fun stuff title
var titleFunStuffBox = document.createElement('div');
titleFunStuffBox.style.cssText = boxStyle;
titleFunStuffBox.style.order = '1';
column3.appendChild(titleFunStuffBox);

//Box for settings
var boxSettings = document.createElement('div');
boxSettings.style.cssText = boxStyle;
boxSettings.style.order = '2';
column2.appendChild(boxSettings);

//Box for buttons
var box2 = document.createElement('div');
box2.style.cssText = settingsStyle;
box2.style.bottom = '4px';
box2.style.right = '24px';
document.body.appendChild(box2);

//Box for fun stuff
var boxFunStuff = document.createElement('div');
boxSettings.style.cssText = boxStyle;
boxSettings.style.order = '3';
column3.appendChild(boxFunStuff);

//Button to minimize tracker
var closeButton = document.createElement('div');
closeButton.innerHTML = '&#9776;';
closeButton.title = 'Minimize tracker';
closeButton.style.cssText = buttonStyle;
box2.insertBefore(closeButton, box2.firstChild);
closeButton.addEventListener("click", function () { hideTracker(); });

//Button to reset tracker stats
var resetButton = document.createElement('div');
resetButton.innerHTML = '&#8634;';
resetButton.title = 'Restart tracker';
resetButton.style.cssText = buttonStyle;
box2.insertBefore(resetButton, closeButton);
resetButton.addEventListener("click", function () { resetTracker(); });

//Button to open settings
var settingsButton = document.createElement('div');
settingsButton.innerHTML = '&#9881;';
settingsButton.title = 'Open settings menu';
settingsButton.style.cssText = buttonStyle;
box2.insertBefore(settingsButton, resetButton);
settingsButton.addEventListener("click", function () { hideSettings(); });

//Button for fun stuff!
var funStuffButton = document.createElement('div');
funStuffButton.innerHTML = '&#9728;';
funStuffButton.title = 'Fun stuff!';
funStuffButton.style.cssText = buttonStyle;
box2.insertBefore(funStuffButton, settingsButton);
funStuffButton.addEventListener("click", function () { hideFunStuff(); });

//Button for share snapshot
var shareSnapshotButton = document.createElement('div');
shareSnapshotButton.title = 'Copy a shareable snapshot of your account progress, formatted for discord';
shareSnapshotButton.style.cssText = buttonSettingsStyle;
boxFunStuff.appendChild(shareSnapshotButton);

//Button to toggle rare drop sound alerts
var rareAlertButton = document.createElement('div');
rareAlertButton.title = 'Toggle repeated sound notifications when a rare item is found';
rareAlertButton.style.cssText = buttonSettingsStyle;

//Button to toggle idle sound alerts
var idleAlertButton = document.createElement('div');
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
var boxFunStuffToggleState = false;
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

const gatherPages = ['Woodcutting', 'Mining', 'Farming', 'Fishing'];
const craftPages = ['Smelting', 'Smithing', 'Forging', 'Alchemy', 'Cooking'];
const combatPages = ['One-handed', 'Two-handed', 'Ranged', 'Defense'];

const blacklistedPages = ['Inventory', 'Equipment', 'House', 'Merchant', 'Market', 'Quests', 'Leaderboards', 'Changelog',
    'Settings', 'Discord', 'Reddit', 'Patreon', 'Rules', 'Terms of Use', 'Privacy Policy', 'Guild'];

const boneList = ['Bone', 'Fang', 'Medium Bone', 'Medium Fang', 'Large Bone', 'Large Fang', 'Giant Bone'];

const combatPotionList = ['Combat Potion', 'Double Attack Potion', 'Resistance Potion', 'Super Combat Potion',
    'Super Double Attack Potion', 'Super Resistance Potion', 'Divine Combat Potion',
    'Divine Double Attack Potion', 'Divine Resistance Potion'];

const gatheringPotionList = ['Gather Level Potion', 'Gather Speed Potion', 'Super Gather Level Potion',
    'Super Gather Speed Potion', 'Divine Gather Level Potion',
    'Divine Gather Speed Potion'];

const craftingPotionList = ['Craft Level Potion', 'Craft Speed Potion', 'Super Craft Level Potion',
    'Super Craft Speed Potion', 'Divine Craft Level Potion',
    'Divine Craft Speed Potion'];

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

//instantiate variables for tracker
//let startedTrackerBeforeSkill = false;
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

function resetTracker() { //Reset all stats in the tracker
    box.innerHTML = ''; //Clear stat box content immediately
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

function hideTracker() { //minimize the tracker UI
    stopSound();
    if (boxToggleState == true) {
        document.body.removeChild(mainFlexbox);
        boxToggleState = false;
    }
    else {
        document.body.appendChild(mainFlexbox);
        boxToggleState = true;
/*        if (isRunning == true) {
            box.innerHTML = loadingText;
        }
        else {
            box.innerHTML = startingText;
        }
        */

    }
}

//'<div style="display:flex; min-width: 150px; justify-content: space-between; margin:0; padding: 4px 12px 0px; border-radius: 10px; border-radius: 10px border-color: gray; border-style: solid;">' +


function hideSettings() { //minimize the tracker UI
    stopSound();
    if (boxSettingsToggleState == false) {
        mainFlexbox.appendChild(column2);

        if (rareAlert == true) { rareAlertButton.style.color = 'lightgreen'; } else { rareAlertButton.style.color = 'red'; }
        if (idleAlert == true) { idleAlertButton.style.color = 'lightgreen'; } else { idleAlertButton.style.color = 'red'; }
        //boxSettings.innerHTML = '<div style=\"text-align:left;\">Settings<span style=\"float:right;">v' + GM_info.script.version + '</span></div> <hr style=\"border-color:inherit; margin: 6px -4px 4px\"></hr>';

        titleSettingsBox.innerHTML = '<div style="display:flex; min-width: 150px; align-items: baseline; border-bottom: 1px solid gray; padding: 0px 0px 5px">' +
        '<div style="flex: 1; margin: 0px; padding: 0px;">&nbsp;Settings</div>' +
            '<div style="flex: 1; text-align:right;"> v' + GM_info.script.version + '&nbsp; </div>' +
            '</div>';
    

        rareAlertButton.innerHTML = 'Rare drop sound';
        boxSettings.appendChild(rareAlertButton, boxSettings.firstChild);
        idleAlertButton.innerHTML = 'Idle sound';
        boxSettings.insertBefore(idleAlertButton, boxSettings.lastChild);
        rareAlertButton.addEventListener("click", function () { toggleRareAlert(); });
        idleAlertButton.addEventListener("click", function () { toggleIdleAlert(); });
        boxSettingsToggleState = true;
    }
    else {
        mainFlexbox.removeChild(column2);
        boxSettingsToggleState = false;
    }
}

function hideFunStuff() { //minimize the tracker UI
    stopSound();
    if (boxFunStuffToggleState == false) {
        mainFlexbox.appendChild(column3);

        titleFunStuffBox.innerHTML = '<div style="display:flex; min-width: 150px; align-items: baseline; border-bottom: 1px solid gray; padding: 0px 0px 5px">' +
        '<div style="flex: 1; margin: 0px; padding: 0px;">&nbsp;Fun Stuff</div>' +
            '<div style="flex: 1; text-align:right;">' + '' + '&nbsp; </div>' +
            '</div>';
    
        shareSnapshotButton.innerHTML = 'Share snapshot';
        shareSnapshotButton.addEventListener("click", function () { shareSnapshot(); });
        boxFunStuffToggleState = true;
    }
    else {
        mainFlexbox.removeChild(column3);
        boxFunStuffToggleState = false;
    }
}

function toggleRareAlert() { //toggle sound alert for rare drop
    console.log('rare');
    if (rareAlert == true) {
        //        console.log('become red!');
        rareAlertButton.style.color = 'red';
        rareAlert = false;
        (async () => { await (GM.setValue('rareAlert', false)); })();
    }
    else {
        //        console.log('become green!');
        rareAlertButton.style.color = 'lightgreen';
        rareAlert = true;
        (async () => { await (GM.setValue('rareAlert', true)); })();
    }
}

function toggleIdleAlert() { //toggle sound alert for rare drop
    if (idleAlert == true) {
        idleAlertButton.style.color = 'red';
        idleAlert = false;
        (async () => { await (GM.setValue('idleAlert', false)); })();
    }
    else {
        idleAlertButton.style.color = 'lightgreen';
        idleAlert = true;
        (async () => { await (GM.setValue('idleAlert', true)); })();
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

function shareSnapshot() {
    let skillsList = document.getElementsByClassName('scroll custom-scrollbar scroll-margin')[0].childNodes;
    let skillTemp = '';
    let skillOutput = '';
console.log(skillsList.length);
console.log(skillsList[9].innerText);
    for (let i = 0; i < (skillsList.length-13); i++) {
        console.log(skillsList[i].innerText);
        if (skillsList[i].innerText.includes('Lv.')) {
        skillOutput += '> ' + skillsList[i].innerText.replace(/[\n\r]+/g, ' ') + '\n';
        }
    }
console.log(skillOutput);
GM_setClipboard(skillOutput, "text");
}

function showMessage(text){
    messageBox.innerHTML = '<div style="align-self: flex-end; text-align: center; justify-self: center; margin-top: auto;">' + text + '</div>';
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
    for (let i = 0; i <= list.length - 1; i++) {
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
    let progress = values[values.length - 1].split(' / ');;
    //console.log(values);
    //console.log(progress);
    trackedSkill.currentLevel = values[1].split(' / ')[0].slice(4);
    trackedSkill.currentLevelXP = removeCommas(progress[0]);
    trackedSkill.nextLevelXP = removeCommas(progress[1].slice(0, -3));
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
            titleBox.innerHTML = displayBox("active")[0];
            box.innerHTML = displayBox("active")[1];
            showMessage('');
        }
        else {
            titleBox.innerHTML = displayBox("inactive")[0];
            box.innerHTML = '';
            messageBox.innerHTML = '';
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

    let requiredXP = trackedSkill.nextLevelXP - trackedSkill.currentLevelXP;
    let estimatedLevelTime = requiredXP / xpPerMs;

    let milestoneLevel = calcMilestone(trackedSkill.currentLevel); //[Level, Total XP]
    //console.log(milestoneLevel)
    let requiredXpMilestone = milestoneLevel[1] - trackedSkill.currentXp;
    //console.log('requirexpmilestone: ', requiredXpMilestone, 'currentXp:', trackedSkill.currentXp,  )
    let estimatedMilestoneTime = requiredXpMilestone / xpPerMs;
    //console.log('estimated milestone time: ', estimatedMilestoneTime/1000)
    //console.log((Date.now + estimatedLevelTime));
    //(trackedSkill.currentLevel) - trackedSkill.currentXp);
    //console.log(Date.now(), (Date.now() + estimatedLevelTime));

    let boxContents = '';
    let boxTitle = '<div style="display:flex; min-width: 220px; align-items: baseline; border-bottom: 1px solid gray; padding: 0px 0px 4px">' +
        '<div style="flex: 1; margin: 0px; padding: 0px;">&nbsp;<img style="vertical-align: middle; width: 24px; height: 24px; image-rendering: pixelated" src="assets/misc/' + getIcon(trackedSkill.name) + '">&nbsp;</div>' +
        '<div style="flex: 2; margin: 0px; padding: 0px;">&nbsp;<b>' + trackedSkill.name + '</b></div>' +
        '<div style="flex: 1; text-align:right;">' + determineTimer((Date.now() - trackedSkill.startTime)) + '&nbsp; </div>' +
        '</div>';




    let boxDivider = '<hr style="border-color:gray;"></hr>';
    let boxXP = '<p title="Total XP earned\" style=\"color:LightGreen;"><span style="text-align:left;";>XP: ' + earnedXp.toLocaleString('en') + '<span style=\"float:right;"> &#013;(' + xpPerHour.toLocaleString('en') + '/h)</span></p>';
    let boxNextLevel = '<p title="Estimated time until next level\" style=\"color:CornflowerBlue; text-align:center; border-top: 1px solid gray"> Level up ' + dayjs((Date.now() - estimatedLevelTime)).toNow() + '</p>';
    let boxNextMilestone = '<p title="Estimated time until next milestone level\" style=\"color:CornflowerBlue; text-align:center"> Tier up ' + dayjs((Date.now() - estimatedMilestoneTime)).toNow() + '</p>';
    let boxCoins = '<p title="Total coins earned\" style=\"color:Gold;">Coins: ' + earnedCoins.toLocaleString('en') + '<span style=\"float:right;"> &#013;(' + coinsPerHour.toLocaleString('en') + '/h)</span></p>';
    let boxKills = '<p title="Total enemies defeated &#013;Alpha monsters count as multiple kills &#013;Dungeon monsters are only tallied after completing a dungeon" style=\"color:Tomato;">Kills: ' + enemyKills.toLocaleString('en') + '<span style=\"float:right;\"> &#013;(' + killsPerHour.toLocaleString('en') + '/h)</span></p>';
    let boxFood = '<p title="Total food consumed\" style=\"color:Salmon;">Food: ' + usedFood.toLocaleString('en') + '<span style="float:right;"> &#013;(' + foodPerHour.toLocaleString('en') + '/h)</span></p>';
    const boxCombatPotions = '<p title="Total combat potions consumed\" style=\"color:Orange;">Combat Pots: ' + usedCombatPotions.toLocaleString('en') + '<span style="float:right;"> (' + combatPotionsPerHour.toLocaleString('en') + '/h)</span></p>';
    const boxGatheringPotions = '<p title="Total gathering potions consumed\" style=\"color:Pink;">Gathering Pots: ' + usedGatheringPotions.toLocaleString('en') + '<span style="float:right;"> (' + gatheringPotionsPerHour.toLocaleString('en') + '/h)</span></p>';
    const boxCraftingPotions = '<p title="Total crafting potions consumed\" style=\"color:LightBlue;">Crafting Pots: ' + usedCraftingPotions.toLocaleString('en') + '<span style="float:right;"> (' + craftingPotionsPerHour.toLocaleString('en') + '/h)</span></p>';
    let boxArrows = '<p title="Total arrows consumed\" style=\"color:Wheat;">Arrows: ' + usedArrows.toLocaleString('en') + '<span style="float:right;"> &#013;(' + arrowsPerHour.toLocaleString('en') + '/h)</span></p>';
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
        if (earnedXp > 0) {
            //           boxContents += boxNextLevel;
            boxContents += boxNextLevel;
            //console.log(milestoneLevel[0]);
            //console.log(trackedSkill.currentLevel);
            if ((milestoneLevel[0] - 1) != trackedSkill.currentLevel) { //Don't display milestone progress if next tier is only 1 level away
                boxContents += boxNextMilestone;
            }
        }
        return [boxTitle, boxContents];
    }

    return [boxTitle, ''] //return only title if inactive
}
    

    //return boxTitle + boxDivider + boxContents;

dayjs.extend(window.dayjs_plugin_relativeTime);
dayjs.extend(window.dayjs_plugin_duration);

showMessage(startingText);
setInterval(trackerLoop, timeInterval); //Recurring stat box updater
