/*
Name: MIDI Controller Helper
Author: Marty Opsahl, Mega Pixel Music Lab
Purpose:	This uses MIDI cc buttons to change the mapping of other controls. 
		With a button press faders and knobs can control new plugin parameters. 
		 
Use:
	This setup is based on the KORG nanoKONTROL2.
	It has 8 faders, 8 knobs and 24(or 32) buttons.
	Set the button mode to toggle, on value to 127 and off value to 0.
	The controller must be setup with the following CC Numbers:
	Knobs:  21-28
	Faders: 31-38
	Solo:   41-48
	Mute:   51-58
	Rec:    71-78
	Select: 81-88

	On a nanoKONTROL2 I setup the select buttons as the transport buttons.
	Rew:	81
	FF:		82
	Stop:	83
	Play:	84
	Record:	85
	Set:	86
	Cycle:	87

	Use the target controls to map a plugin parameter.
	Then assign a button to change to that control set. 
	The buttons can also be mapped to parameters.
	Saving the scripter will save the mapped parameters for use later.
	Sometimes Logic will reload the plugin without mappings in tact.
	I've always been able to get then back by reloading the settings again.
	

Contacts and sites:
https://opengameart.org/users/mega-pixel-music-lab
https://soundcloud.com/megapixelmusic
https://megapixelmusiclab.bandcamp.com
https://www.youtube.com/channel/UCZBTcrBs8G8uBFJfUzGln0w

Copyright (c) Martin Opsahl and Mega Pixel Music Lab
Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const KNOB = [NaN,21,22,23,24,25,26,27,28];
const FADER = [NaN,31,32,33,34,35,36,37,38];
const SOLO = [NaN,41,42,43,44,45,46,47,48];
const MUTE = [NaN,51,52,53,54,55,56,57,58];
const REC = [NaN,71,72,73,74,75,76,77,78];
const SELECT = [NaN,81,82,83,84,85,86,87,88];
const BUTTON_LIST_NAMES = ["Unassigned",
					"Solo 1 CC:41", "Solo 2 CC:42", "Solo 3 CC:43","Solo 4 CC:44", "Solo 5 CC:45", "Solo 6 CC:46","Solo 7 CC:47", "Solo 8 CC:48",
					"Mute 1 CC:51", "Mute 2 CC:52", "Mute 3 CC:53","Mute 4 CC:54", "Mute 5 CC:55", "Mute 6 CC:56","Mute 7 CC:57", "Mute 8 CC:58",
					"Rec 1 CC:71", "Rec 2 CC:72", "Rec 3 CC:73","Rec 4 CC:74", "Rec 5  CC:75", "Rec 6 CC:76","Rec 7 CC:77", "Rec 8 CC:78",
					"Rewind CC:81", "Forward CC:82", "Stop CC:83","Play CC:84", "Record CC:85", "Cycle CC:86","Select 7 CC:87", "Select 8 CC:88"];
					
const CONTROL_NAMES = new Object();
for(let i = 1; i<=8 ; i++){
	CONTROL_NAMES[KNOB[i]] = ("Knob"+ i + " ("+KNOB[i]+")");
	CONTROL_NAMES[FADER[i]] = ("Fader"+ i + "("+FADER[i]+")");
	CONTROL_NAMES[SOLO[i]] = ("Solo"+ i + " ("+SOLO[i]+")");
	CONTROL_NAMES[MUTE[i]] = ("Mute"+ i + " ("+MUTE[i]+")");
	CONTROL_NAMES[REC[i]] = ("Rec"+ i + "  ("+REC[i]+")");
	CONTROL_NAMES[SELECT[i]] = ("Select"+ i + " ("+SELECT[i]+")");
}

const BUTTON_LIST_CC = [NaN];
for(let i = 1; i<=8; i++){
	BUTTON_LIST_CC.push(SOLO[i]);
}
for(let i = 1; i<=8; i++){
	BUTTON_LIST_CC.push(MUTE[i]);
}
for(let i = 1; i<=8; i++){
	BUTTON_LIST_CC.push(REC[i]);
}
for(let i = 1; i<=8; i++){
	BUTTON_LIST_CC.push(SELECT[i]);
}

const LFO_KNOB_FADER_LIST = [KNOB[1],FADER[1],KNOB[2],FADER[2],KNOB[3],FADER[3],KNOB[4],FADER[4],KNOB[5],FADER[5],KNOB[6],FADER[6],KNOB[7],FADER[7],KNOB[8],FADER[8]];


let ALSO_SEND_MIDI_CC = true;
const EXTERNAL_LIGHT_CONTROL = false;
const USE_MUTE_FOR_PARAMETERS = false;
const USE_SOLO_FOR_PARAMETERS = false;
const USE_REC_FOR_PARAMETERS = false;
const LFO_SYNC_CONTROL = false;
const USE_SELECT_FOR_PARAMETERS = true;
const MIDI_CHANNEL = 1;

const NUMBER_OF_CONTROL_SETS = 24; //Change this number to set the number of control sets to setup. 

const toggleGroup = new Array();

const buttonState = new Array();
const ppMapNames = new Array();
ppMapNames[0] = new Object;

var PluginParameters = [];

for(let i = 0; i<8; i++){
	buttonState[MUTE[1]+i] = false;
	buttonState[SOLO[1]+i] = false;
	buttonState[REC[1]+i] = false;
	buttonState[SELECT[1]+i] = false;
}

const parameterMath = new Array();
parameterMath[0] = new Object;

const parameterNameChange = new Array();
parameterNameChange[0] = new Object;

//Change Control is an object to just contain a midi cc and channel for the modifer.
function newChangeControl(changeCC, newChannel) {
	return {cc:changeCC, channel:newChannel}
}

//Modifier is an object for changing the mappings
//Modifier contains the CC for the changing, the channel, control set number, default set number and a list of 
function newModifier(modifyCC, channel, cSet, defaultSet ,changeCCs){
	const changedControls = new Array();
	if(changeCCs == null){
		let section = modifyCC%10;
		changedControls.push(newChangeControl(20+section,channel));
		changedControls.push(newChangeControl(30+section,channel));
	}
	else {
		for (let i = 0; i< changeCCs.length; i++){
			changedControls.push(newChangeControl(changeCCs[i], channel));
		}
	}
	return {buttonCC:modifyCC, channel:channel, set:cSet, default:defaultSet, changedControls:changedControls}
}

//Control contains a cc midi channel and a list of names that are mapped to plugin parameters.
//The list of names is an array indexed by the set number. Set 0 is the default.
function newControl(newCC, newChannel, names) {
	let repeat;
	for(name of names) {
		repeat = false
		for(let i = 0; i < PluginParameters.length; i++) {
			if(PluginParameters[i].name == name){
				repeat = true;
				i = PluginParameters.length;
			}
		}
		
		if(!repeat && name != "")
			PluginParameters.push({name:name, type:"target"});
	}
	return {cc:newCC, channel:newChannel, paramNames:names}
}

//Mode is a setup of the controls and modifiers.
//This was setup like this for possible complete changes to different modes, but this level of change hasn't been used yet. 
function newMode(newChangeCC, newChannel, newDefault = null, newEvent) {
	const controls = new Object();
	const modifiers = new Array();
	return {controls:controls, modifiers:modifiers, changeCC:newChangeCC, channel:newChannel, default:newDefault, event:newEvent}
}

//A reset button to return all the button states to off, used in combination with the external light control script.
//When that script is reset, this should be reset too.
if(EXTERNAL_LIGHT_CONTROL) {
	PluginParameters.push({name:"**RESET**", type:"checkbox", defaultValue:0});
}

PluginParameters.push({name:"**Options**", type:"text"});
PluginParameters.push({name:"Send MIDI CC", type:"checkbox", defaultValue:1});

//This is an option to setup a custom control for synced LFOs. These often have different controls for a synced rate or unsynced.
//Set the control set and fader or knob to be used for LFO rate, the button used to turn the sync on/off and also the correct mapped control.
if(LFO_SYNC_CONTROL) {
	PluginParameters.push({name:"LFO Sync Rate Parameter", type:"text"});
	PluginParameters.push({name:"LFO Sync Rate Plugin", type:"target"});
	PluginParameters.push({name:"LFO Sync Button", type:"menu", valueStrings:BUTTON_LIST_NAMES, defaultValue:0});

	PluginParameters.push({name:"LFO Sync Control", type:"menu", valueStrings:LFO_KNOB_FADER_LIST});
	PluginParameters.push({name:"LFO Sync Set Number", type:"lin", unit:"", minValue:0, maxValue:NUMBER_OF_CONTROL_SETS, numberOfSteps:NUMBER_OF_CONTROL_SETS, defaultValue:0});
}


//Main setup function.  It populates the PluginParameter array, and the structure to keep track of the names of these mapping.
//Also creates all the standard modifiers.
function createControls() {
	const mode = newMode(-1, 1, null, null);
	let parameterNumber = 1;
	let buttonName = "";
	
	PluginParameters.push({name:"**Default Parameters**", type:"text"});
	for(let i = 0; i<8; i++){
		PluginParameters.push({name:parameterNumber+": Knob"+(i+1), type:"target"});
		parameterNumber++;
		PluginParameters.push({name:parameterNumber+": Fader"+(i+1), type:"target"});
		parameterNumber++;
	}
	
	PluginParameters.push({name:"**Solo Parameters**", type:"text"});
	for(let i=0 ; i < 8; i++){
		PluginParameters.push({name:parameterNumber+": Solo"+(i+1), type:"target"});
		parameterNumber++;
	}
	PluginParameters.push({name:"**Mute Parameters**", type:"text"});
	for(let i=0 ; i < 8; i++){
		PluginParameters.push({name:parameterNumber+": Mute"+(i+1), type:"target"});
		parameterNumber++;
	}
	PluginParameters.push({name:"**Rec Parameters**", type:"text"});
	for(let i=0 ; i < 8; i++){
		PluginParameters.push({name:parameterNumber+": Rec"+(i+1), type:"target"});
		parameterNumber++;
	}

	for(let cSet = 1; cSet <= NUMBER_OF_CONTROL_SETS; cSet++){
		PluginParameters.push({name:"**Control Set "+cSet+"**", type:"text"});
		PluginParameters.push({name:"Set " + cSet + " button", type:"menu", valueStrings:BUTTON_LIST_NAMES, defaultValue:cSet});
		PluginParameters.push({name:"Knobs & Faders", type:"text"});
		for(let i = 0; i<8; i++){
			PluginParameters.push({name:parameterNumber+": Knob" + (i+1), type:"target"});
			parameterNumber++;
			PluginParameters.push({name:parameterNumber+": Fader"+(i+1), type:"target"});
			parameterNumber++;
		}
	}
	
	const knobs = new Array();
	const faders = new Array();
	const soloButtons= new Array();
	const recButtons = new Array();
	const muteButtons = new Array();
	for(let i = 0; i < 8; i++) {
		knobs[i] = new Array();
		faders[i] = new Array();
		soloButtons[i] = new Array();
		recButtons[i] = new Array();
		muteButtons[i] = new Array();
	}
	for(let index = 0; index < PluginParameters.length; index++){
		for(let group = 0; group < 8; group++){
			if(PluginParameters[index].name.includes("Knob"+(group+1))){
				knobs[group].push(PluginParameters[index].name);
			}
			else if(PluginParameters[index].name.includes("Fader"+(group+1))){
				faders[group].push(PluginParameters[index].name);
			}
			else if(PluginParameters[index].name.includes("Solo"+(group+1))){
				soloButtons[group].push(PluginParameters[index].name);
			}
			else if(PluginParameters[index].name.includes("Mute"+(group+1))){
				muteButtons[group].push(PluginParameters[index].name);
			}
			else if(PluginParameters[index].name.includes("Rec"+(group+1))){
				recButtons[group].push(PluginParameters[index].name);
			}


		}
	}
	for(let index = 0 ; index < 8; index++){
		mode.controls[KNOB[index+1]] = (newControl(KNOB[1+index],1,knobs[index]));
		mode.controls[FADER[index+1]] = (newControl(FADER[1+index],1,faders[index]));
		mode.controls[SOLO[index+1]] = (newControl(SOLO[1+index],1,soloButtons[index]));
		mode.controls[MUTE[index+1]] = (newControl(MUTE[1+index],1,muteButtons[index]));
		mode.controls[REC[index+1]] = (newControl(REC[1+index],1,recButtons[index]));
	}
	
	for(let cSet = 1; cSet <= NUMBER_OF_CONTROL_SETS; cSet++){
		mode.modifiers.push(newModifier(makeGetButtonSetFunction(cSet),1,cSet,0,[KNOB[1],FADER[1],KNOB[2],FADER[2],KNOB[3],FADER[3],KNOB[4],FADER[4],KNOB[5],FADER[5],KNOB[6],FADER[6],KNOB[7],FADER[7],KNOB[8],FADER[8]]));

	}
	return {controls:mode.controls, modifiers:mode.modifiers}
}

//Create function to get the correct button CC for user setup of buttons.
function makeGetButtonSetFunction(cSet){
	return function () {return getSetButtonFromList(cSet)};
}


let synth = createControls();

initlaizeParameters();

//Setup default mapping of parametersfunction initlaizeParameters(){
	for(let i = 1; i<= 8; i++){
		buttonState[MUTE[i]] = false;
		buttonState[SOLO[i]] = false;
		buttonState[REC[i]] = false;
		buttonState[SELECT[i]] = false;
	}
	assignParametersOfControls(synth.controls);
	Trace("[advanced plug-in helper template]");
	Trace("Control Sets: "+NUMBER_OF_CONTROL_SETS);
	Trace("Size of PluginParameters: "+PluginParameters.length);
	Trace("1000 Max");
}

/**************************************************************************************
	Parameter change functions

	Process
	 1: input MIDI
	 2: checks if a button
	 	2a: updates button state
	 	2b: checks if a modifier and applys the modifier changes
	 	2c: modifier swaps the name of parameters into array list of used parameters from controls list control set names
	 	2d: also sends the button as a parameter change if needed
	 3: Maps midi ccs to parameters
	    3a: creates an event with mapped name in the list of used parameters
	    3b: apply custom name changes, a last step change of parameter names for more complicated plugins, with plugin states that can update based on controls.
	    3c: apply custom math to parameter values to specified parameter names.
	    
**************************************************************************************/

//MIDI inupt function
function HandleMIDI(event)
{
	if (event instanceof ControlChange) {
		if(isButtonCC(event) && (!EXTERNAL_LIGHT_CONTROL || event.value == 127)){
			
			updateButtonState(event);
			
			let alsoEvent = modifyControls(event);
			
			if(alsoEvent) {
				MapCCsToParameters(event);
			}

		}
		else {
			MapCCsToParameters(event);
		}
	}
	else{	
		event.send();
	};
}

//function to modify to check and modifier controls. Goes through list of modifiers and checks if the current MIDI CC is the one of the modifier.
function modifyControls(event) {
	alsoEvent = true; 
	let modifierCC;
	for(const modifier of synth.modifiers){
		if(typeof modifier.buttonCC == "function") {
			modifierCC = modifier.buttonCC();
		}
		else {
			modifierCC = modifier.buttonCC;
		}
		if(modifierCC == event.number && modifier.channel == event.channel) {
			
			if(buttonOn(event)) {
				assignParametersOfModifiers(modifier, synth.controls);
			}
			else if(buttonOff(event)) {

				unassignParametersOfModifiers(modifier, synth.controls);
			}
		}
	}
	return alsoEvent;
}

//Function to map MIDI CCs to the current name of Plugin Parameter
//Apply name change function for more custom name changes after the standard mapping.
//Apply math change for specific mapped names. Done after the custom name change.
//Also sends MIDI CC event if option is enabled.
function MapCCsToParameters(event) {
	if(ppMapNames[event.channel-1][event.number] == undefined){
		return false;
	}
	let valueTweak = false;
	let value = 0;
	var newEvent = new TargetEvent;

	let lastIndex = ppMapNames[event.channel-1][event.number].length-1
	newEvent.target = ppMapNames[event.channel-1][event.number][lastIndex];

	applyNameChange(event, newEvent);
	
	valueTweak = applyCustomMath(event, newEvent);
	if(LFO_SYNC_CONTROL) {
		applyLFOSyncChange(event, newEvent);
	}
	//Trace("has target changed "+newEvent.target);
	if(valueTweak == false){
		newEvent.value = isButtonCC(event) ? buttonState[event.number] : ccScale(event.value);

	}
	
	
	if(GetParameter(newEvent.target) != -1 ) {
		//displayNewEvent(newEvent.target, newEvent.value, 100);
		newEvent.trace();
		newEvent.send();
	}
	
	if(ALSO_SEND_MIDI_CC)
		event.send();
}


//Applys the custom LFO change
function applyLFOSyncChange(event, newEvent){
	if(GetParameter("LFO Sync Rate Plugin") != -1 && buttonState[getLFOSyncButtonCC()]){
		let syncControlName = synth.controls[getLFOControlCC()].paramNames[GetParameter("LFO Sync Set Number")];
		if(syncControlName == newEvent.target){
			newEvent.target = "LFO Sync Rate Plugin";
		}
	}
}

//Changes parameters based on a name. If a condition is true, changes the name of a parameter. 
function applyNameChange(event, newEvent) {
	if(parameterNameChange[event.channel-1][event.number] == undefined)
		return false;
	for(change of parameterNameChange[event.channel-1][event.number]){
		if((change.name == newEvent.target) && change.condition()){
			if(change.newName instanceof Function){
				newEvent.target = change.newName();
			}
			else {
				newEvent.target = change.newName;
			}
			Trace("new event assigned"+newEvent);
			return true;
		}
	}
	return false
}

//Changes the math used to map the 0-127 MIDI CC values to the 0 to 1 values used for Parameters.
function applyCustomMath(event, newEvent){
	if(parameterMath[event.channel-1][event.number] == undefined)
		return false;
	for(change of parameterMath[event.channel-1][event.number]){
		if(change.name == newEvent.target){				
			newEvent.value = change.math(event.value);
			return true;
		}
	}
	return false;
}

function displayNewEvent(eventName, eventValue, scale) {
	Trace("Target:" + eventName + " Value:" + (eventValue*scale).toFixed(1));
}

//Changes controls in the initial setup.
function assignParametersOfControls(controls, cSet = 0){

	for(index = 1; index <= 8; index++){
		assignCCtoParameter(KNOB[index], MIDI_CHANNEL, controls[KNOB[index]].paramNames[cSet]);
		assignCCtoParameter(FADER[index], MIDI_CHANNEL, controls[FADER[index]].paramNames[cSet]);
		assignCCtoParameter(SOLO[index], MIDI_CHANNEL, controls[SOLO[index]].paramNames[cSet]);
		assignCCtoParameter(MUTE[index], MIDI_CHANNEL, controls[MUTE[index]].paramNames[cSet]);
		assignCCtoParameter(REC[index], MIDI_CHANNEL, controls[REC[index]].paramNames[cSet]);
	}
}

//Changes controls for a modifier. 
function assignParametersOfModifiers(modifier, controls, revertToDefault = false) {
	let tempSet = modifier.set;
	let firstParam = true;
	let controlName;
	for(controlToChange of modifier.changedControls){
		controlName = controls[controlToChange.cc].paramNames[tempSet];
		if(GetParameter(controlName) != -1 && GetParameter(controls[controlToChange.cc].paramNames[modifier.set]) != -1){
			if(firstParam){
				Trace("--New Parameters--")
				firstParam = false;
			}
			assignCCtoParameter(controlToChange.cc, controlToChange.channel, controlName);
		}
	}
}

function unassignParametersOfModifiers(modifier, controls) {
	let defaultName;
	let oldName;
	for(controlToChange of modifier.changedControls){
		controlName = controls[controlToChange.cc].paramNames[0];
		oldName = controls[controlToChange.cc].paramNames[modifier.set];
		removeCCofParameter(controlToChange.cc, controlToChange.channel, oldName,controlName);
	}
}

//Custom default function for when a button is turned off. If the default is more complicated than just back to the standard defaults.
function getDefault(){

	return 0;
}

//Function to put a name in the main list of mapped names. ppMapNames is indexd by the controls cc and has values of the names.
function assignCCtoParameter(cc, channel, name) {
	if(ppMapNames[channel-1][cc] == undefined) {
		//Trace("undefined parameter");
		ppMapNames[channel-1][cc] = new Array();
	}
	ppMapNames[channel-1][cc].push(name);
	Trace(CONTROL_NAMES[cc] + " mapped to " + name);
}


function removeCCofParameter(cc, channel, oldName, defaultName){
	let numberOfNames = ppMapNames[channel-1][cc].length;
	for(let index = 0; index < numberOfNames; index++){
		if(ppMapNames[channel-1][cc][index] == oldName){
			ppMapNames[channel-1][cc].splice(index,1);
			Trace(oldName + " removed from "+CONTROL_NAMES[cc]+ " now " + ppMapNames[channel-1][cc][numberOfNames-1]);
			
		}
	}
	if(ppMapNames[channel-1][cc].length == 0 ) {
		ppMapNames[channel-1][cc].push(defaultName);
	}
	//Trace(CONTROL_NAMES[cc] + " mapped to " + ppMapNames[channel-1][cc][numberOfNames-1]);
}

//To check if a current midi cc is the standard buttons used. 
function isButtonCC(event) {
	if(typeof event == "object") {
		return	((event.number >= MUTE[1] && event.number <= MUTE[8]) ||
				(event.number >= SOLO[1] && event.number <= SOLO[8]) ||
				(event.number >= SELECT[1] && event.number <= SELECT[8]) ||
				(event.number >= REC[1] && event.number <= REC[8]))
	}
	else if(Number.isInteger(event)) {
		return	((event >= MUTE[1] && event <= MUTE[8] ) ||
				(event >= SOLO[1] && event <= SOLO[8] ) ||
				(event >= SELECT[1] && event <= SELECT[8] ) ||
				(event >= REC[1] && event <= REC[8] ))
	}
	else 
		return false
}

function buttonOff(event) {

	return !buttonState[event.number]
}

function buttonOn(event) {

	return buttonState[event.number]
}

//Function to update the buttons. When external buttons are used, a toggle group can be setup so only one button can be on in a list.
//If external buttons aren't needed, it just changes the value of a button directly.
function updateButtonState(event){

	if(EXTERNAL_LIGHT_CONTROL) {
		if(event.value == 0)
			return null
		Trace(event);
		for(group of toggleGroup){
			let inGroup = false;
			let originalState = buttonState[event.number];
			for(cc of group){
				if(event.number == cc){
					inGroup = true;
					break
				}
			}
			if(inGroup == true){
				for(cc of group){
					buttonState[cc] = false;
				}
			}
			buttonState[event.number] = originalState;
		}
		buttonState[event.number] ^= true;
	}
	else {
		buttonState[event.number] = (event.value == 0 ? false : true);
	}
	
}

function ParameterChanged(param,value){	
	if(param == 1) {
		ALSO_SEND_MIDI_CC = value;
	}
}

//Returns the correct MIDI given an Set number from the list of 
function getSetButtonFromList(cSet){
	let parameterListName = "Set "+ cSet+" button";
	return buttonCCFromList(GetParameter(parameterListName));
}

//Returns the MIDI CC from the selected list
function buttonCCFromList(index){
	return BUTTON_LIST_CC[index];
}

/**************************************************************************************
	Custom Math
	use parameterMath to apply different cc mappings of 0-127 to 0-1.
	Also can be used to update the state of the helper. For controls that will change between different synth parts.
	
	Parameter Math Refence
	ccScale(x)			:Standard cc value send. Divides the cc value by 127. Also adds an offset so cc 63 maps to 0.5, since 127 values doesn't have a true middle value.
	ccScaleInv(x)		:Reverses values and uses ccScale. (0 maps to 127 and 127 maps to 0)
	scaleKnobToSwitch(x) :For non buttons being used as on/off controls. Makes values above 63 send 1 and values below send 0. 
	scaleToSemitones(x) 	:For tuning and pitch controls that have continuos values between -12 to +12 semitones.(can be easily changed to more octaves)
						 Sends decimal values that correspond to semitones. Also scales the values around 1 semitone to have more control over detune.
	
	{name:"parameter to change", math:function that is apllied to the values)
**************************************************************************************/

for(let i = 1; i <= 8; i++){
	parameterMath[0][FADER[i]]= new Array();
	parameterMath[0][KNOB[i]]= new Array();
}

function ccScale(x) {
	let value = x/127+0.003937007874016;
	if(value > 1)
		value = 1;
	else if(value < 0.004)
		value = 0;
	return value;
}

function ccScaleInv(x) {
	return ccScale(127-x);
}

function scaleKnobToSwitch(x){
	return (x <= 63 ? 0 : 1);
}

function scaleToSemitones(x) {
	let value;
	let scaledValue;
	if(x<=15) {
		scaledValue = x*1.6666666666667;
	}
	else if(x<=39){
		scaledValue = 25+(x-15)*1.25;
	}
	else if(x<= 63){
		scaledValue = 55+(x-39)*0.3333333333333333;
	}
	else if(x< 88){
		scaledValue = 72-(88-x)*0.36;
	}
	else if(x<112){
		scaledValue = 102-(112-x)*1.25;
	}
	else {
		scaledValue = 127-(127-x)*1.6666666666666666667;
	}
	
	if(scaledValue <= 58){
		value = 0.5 + (scaledValue-60)*0.00833333333;
	}
	else if(scaledValue>=69){
		value = 0.5 + (scaledValue-67)*0.00833333333;
	}
	else{
		value = 0.5+(scaledValue-63)*0.002604166667;
	}
	
	return (0.5+24/50*(value-0.5))
}


/**************************************************************************************
	Custom Parameter Names
	Use to setup parameter name changes based on synth changes. 
	For example, a control might change the effect used in a plugin. Additional mappings are needed based on what state the plugin is in.
	Needs functions to update state, which can be put in a name change function or the math functions. 
	Then a different name can be applied based on the condition.
	
	
	{name:"old parameter name", newName:"new parameter name", condition:function to check if name change should occur.)
**************************************************************************************/
for(let i = 1; i <= 8; i++){
	parameterNameChange[0][FADER[i]] = new Array();
	parameterNameChange[0][KNOB[i]] = new Array();
	parameterNameChange[0][REC[i]] = new Array();
	parameterNameChange[0][SOLO[i]] = new Array();
	parameterNameChange[0][MUTE[i]] = new Array();
}

function getLFOControlCC(){
	let controlIndex = GetParameter("LFO1 Sync Control");
	return LFO_KNOB_FADER_LIST[controlIndex];

}