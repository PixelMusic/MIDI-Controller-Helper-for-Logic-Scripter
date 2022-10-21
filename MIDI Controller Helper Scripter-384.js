/*
Name: MIDI Controller Helper-384
Author: Marty Opsahl

Purpose:
A tool to help map MIDI controllers to plugins.
Use buttons on MIDI controllers to change what controls are mapped to.
Modify what values are sent to the plugins. 
Easily save controller mappings and change mappings 
without dealing with Logic's Controller Assignments.

Use:
This setup is based on the KORG nano Kontrol Studio.
It has 8 faders, 8 knobs and 32 buttons.
The controller must be setup with the following CC Numbers:
Knobs:  21-28
Faders: 31-38
Mute:   41-48
Solo:   51-58
Rec:    71-78
Select: 81-88
The buttons should be setup in toggle mode with On sending 127 and Off sending 0. 

The Mute buttons are modifiers. The modifiers will change whatever control is mapped in
the Plugin Parameter controls. If a control isn't mapped, then no change will happen
for that knob or fader. The original MIDI CC message is also sent to the plugin.

The Mute modifiers also function as defaults, the first button that is on from the left
will be the new default.

The Solo and Rec buttons can be used as either Modifiers or Parameters. 
To setup modifiers add the following lines below.
mode.modifiers.push(newModifier( BUTTONCC, CHANNEL, ALT, DEFAULTALT, [CC1, CC2, CC3...]));

*/
var PluginParameters = [];
//ppMapNames contains the PluginParameter name to use. The first index is the midi channel.
//The second index is the CC number. This script only used midi channel 1.
const ppMapNames = new Array();
ppMapNames[0] = new Object;
//Keeps track of the buttons on/off in the script. Used for having the mute buttons
//be defaults when on. 
const buttonState = new Object();
for(let i = 0; i<8; i++){
	buttonState[41+i] = false;
	buttonState[51+i] = false;
	buttonState[71+i] = false;
	buttonState[71+i] = false;
}
//rangeTweaks holds objects that for custom math
//push an object {name:Parameter Name, math:customMath}. 
const rangeTweaks = [];
//Custom math function to reverse the parameter value.
function ccScaleInv(x) {
	return ccScale(127-x);
}

//Standard math function to map 0-127 CC values to the 0-1 paramater values
//The extra add offset is so cc value 63 gets mapped to 0.5. Most plugins can't get 
//to exactly in the middle without this offset. 
function ccScale(x) {
	let value = x/127+0.003937007874016;
	if(value > 1)
		value = 1;
	else if(value < 0.004)
		value = 0;
	return value;
}
/***************************************************************
********************RANGE TWEAKS********************************
****************************************************************
Put the custom parameter math ranges here. 
*/
//rangeTweaks.push({name:"18: Fader1", math:ccScaleInv});

//Object to hold new a CC number for modifiers.
function newChangeControl(changeCC, newChannel) {
	return {cc:changeCC, channel:newChannel}
}

//Standard arrays for the ccs used in controls.
//allControls is all the ccs Knobs: 21-28 Faders: 31-38 Select: 81,88.
//controlSet is an array with the index return an array of the ccs for a signle set. 
//controlSet[1] = [21,31,81] and controlSet[7] = [27,37,87]
const allControls = new Array();
const controlSet = new Array();
for(let i = 0; i<8; i++){
	allControls.push(21+i);
	allControls.push(31+i);
	controlSet.push([21+i,31+i]);
}

//Creates a modifier object.
//modifier.buttonCC is the button used to use the modifier.
//modifier.channel is the midi channel of the button.
//modifier.alt is which alternate control to use. Current setup with 3alts per control.
//More custom controls may have more or less. Alt index 0 is the standard default control.
//modifier.default is the alt index when the button is off.
//modifier.changedControls is an array of 
function newModifier(modifyCC, channel, alt, defaultAlt ,changeCCs){
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
	return {buttonCC:modifyCC, channel:channel, alt:alt, default:defaultAlt, changedControls:changedControls}
}

//Creates a new set of Controls for a given midi CC. The order of the names are the 
//the index of alts for modifiers. Has code add a name to the Plugin Parameters.
//This script creates the PluginParameters first. 
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

//Mode is the functionality of all the parameters and modifiers. In other helper scripts
//this is designed to get swapped out for changing functionality. 
function newMode(newChangeCC, newChannel, newDefault = null, newEvent) {
	const controls = new Array();
	const modifiers = new Array();
	return {controls:controls, modifiers:modifiers, changeCC:newChangeCC, channel:newChannel, default:newDefault, event:newEvent}
}

//The main function that populates the PluginParameters names. The Controls with alts,
//and the modifier buttons. The PluginParameters are created first, and then searched
//for knob and fader names. Each PluginParameter has a index number first, so there's no
//conflicting names and as an easy reference for the parameter. 
function createControls() {
	const mode = newMode(-1, 1, null, null);
	let parameterNumber = 1;
	let buttonName = "";
	
	PluginParameters.push({name:"**Special Events**", type:"text"});
	for(let i = 0; i < 2;i++) {
		PluginParameters.push({name:"Setup "+(i+1), type:"target"})
	}
	
	PluginParameters.push({name:"**Default**", type:"text"});
	for(let i = 0; i<8; i++){
		PluginParameters.push({name:parameterNumber+": Knob"+(i+1), type:"target"});
		parameterNumber++;
		PluginParameters.push({name:parameterNumber+": Fader"+(i+1), type:"target"});
		parameterNumber++;
	}
	PluginParameters.push({name:"**Select**", type:"text"});

	for(let i = 0;i < 8;i++){
		PluginParameters.push({name:parameterNumber+": Select"+(i+1), type:"target"});
		parameterNumber++;
	}
	PluginParameters.push({name:"**Solo&Rec Parameters**", type:"text"});
	for(let i=0 ; i < 8; i++){
		PluginParameters.push({name:parameterNumber+": Solo"+(i+1), type:"target"});
		parameterNumber++;
		PluginParameters.push({name:parameterNumber+": Rec"+(i+1), type:"target"});
		parameterNumber++;
	}
	
	for(let alt = 1; alt < 9; alt++){
		PluginParameters.push({name:"**Alternate "+alt+"**", type:"text"});
		for(let i = 0; i < 8; i++){
			PluginParameters.push({name:parameterNumber+": Knob"+(i+1), type:"target"});
			parameterNumber++;
			PluginParameters.push({name:parameterNumber+": Fader"+(i+1), type:"target"});
			parameterNumber++;
		}
		buttonName = "Mute "+alt;
		PluginParameters.push({name:"**"+buttonName+"**", type:"text"}) ;
		for(let i = 0; i<8; i++){
			PluginParameters.push({name:parameterNumber+": Knob"+(i+1), type:"target"});
			parameterNumber++;
			PluginParameters.push({name:parameterNumber+": Fader"+(i+1), type:"target"});
			parameterNumber++;
		}
	}
	
	for(let alt = 9; alt < 16; alt++){
		PluginParameters.push({name:"**Alternate "+alt+"**", type:"text"});
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
	const selectButtons = new Array();
	for(let i = 0; i < 8; i++) {
		knobs[i] = new Array();
		faders[i] = new Array();
		soloButtons[i] = new Array();
		recButtons[i] = new Array();
		selectButtons[i] = new Array();
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
				
				[51+group] = PluginParameters[index].name;
			}
			else if(PluginParameters[index].name.includes("Rec"+(group+1))){
				recButtons[group].push(PluginParameters[index].name);
				recParameterName[71+group] = PluginParameters[index].name;
			}
			else if(PluginParameters[index].name.includes("Select"+(group+1))){
				selectButtons[group].push(PluginParameters[index].name);
			}
		}
	}
	for(let index = 0; index < 8; index++){
		mode.controls.push(newControl(21+index,1,knobs[index]));
		mode.controls.push(newControl(31+index,1,faders[index]));
		mode.controls.push(newControl(51+index,1,soloButtons[index]));
		mode.controls.push(newControl(71+index,1,recButtons[index]));
		mode.controls.push(newControl(81+index,1,selectButtons[index]));
	}
	let alt =2
	
	//Create the standard modifiers for the mute buttons.
	//Other standard modifiers could be added here.
	for(let i = 0; i< 8; i++){
		mode.modifiers.push(newModifier(41+i,1,alt,0,allControls));
		alt +=2;
	}
	/***************************************************************
	********************CUSTOM MODIFIER SECTION*********************
	****************************************************************/
	/* 
	Use:
	mode.modifiers.push(newModifier( BUTTONCC, MIDIChannel, ALTNumber, DEFAULTAltNumber, [MODIFIEDCC1, MODIFIEDCC2, MODIFIEDCC3...]));
	BUTTONCC = the cc of modifier button. Solo 51-58, Rec 71-78, Select 81-88.
	MIDIChannel = MIDI Channel of the button, usually 1. 
	(Different Scenes are set to different Channels, if more controls are needed.)
	ALTNumber = the alt to use when the button is on. 
	The Alts number are referenced in the table below.
	DEFAULTAltNumber = the alt to use when the button is turned off.
	The initial alt is 0. 
	MODIFIEDCCx = the CCs to be modified by the button.
	Knobs are 21-28 and Faders are 31-38. 

	*/
	/*Custom Modifiers Use Init = 0,  Alt1 = 1, Mute1 = 2, 
									Alt2 =3, Mute2 = 4,
									Alt3 = 5, Mute3 = 6,
									Alt4 = 7, Mute4 = 8,
									Alt5 = 9, Mute5 = 10,
									Alt6 = 11, Mute6 = 12,
									Alt7 = 13, Mute7 = 14
									Alt8 = 15, Mute8 = 16.
									Alt9 = 17, Alt10 = 18,
									Alt11 = 19, Alt12 = 20,
									Alt13 = 21, Alt14 = 22,
									Alt15 = 23 alt*/
	//mode.modifiers.push(newModifier(58,1,1,0,[27,37,28,38]));
	
	return {controls:mode.controls, modifiers:mode.modifiers}
}

const synth = createControls();

initlaizeParameters();

function initlaizeParameters(){
	assignParametersOfControls(synth.controls);
	Trace("MIDI Controller Helper for Logic Scripter");
	Trace("384 Plugin Parameters");
	Trace("*8 Mute Buttons change all controls");
	Trace("*15 Alternative Parameters");
	Trace("*Set Solo and Rec buttons to parameters in");
	Trace("*****CUSTOM MODIFIER SECTION*****");
}

////////////////Main handleMIDI function///////////////////////////
//Check if CC then modify parameters and/or map to parameters
function HandleMIDI(event)
{
	if (event instanceof ControlChange) {
		if(isButtonCC(event)){
			let alsoEvent = modifyControls(event);
			if(alsoEvent)
				MapCCsToParameters(event);
		}
		else {
			MapCCsToParameters(event);
		}
	}
	else{	
		event.send();
	};
}

//Modify Controls. Check if buttonCC is a modifier button.
//if a modifier button, call assign parameter function. 
function modifyControls(event) {
	alsoEvent = true; 
	for(const modifier of synth.modifiers){
		if(modifier.buttonCC == event.number && modifier.channel == event.channel) {
			
			if(buttonOn(event)) {
				Trace(modifier.buttonCC);
				buttonState[modifier.buttonCC] = true;
				assignParametersOfModifiers(modifier, synth.controls);
			}
			else if(buttonOff(event)) {
				buttonState[modifier.buttonCC] = false;
				assignParametersOfModifiers(modifier, synth.controls, true);
			}
		}
	}
	return alsoEvent;
}

//Assigns the parameters of given alt or the defaults.
function assignParametersOfControls(controls, alt = 0){
	let tempAlt;
	
	for(const parameterToMap of controls){
		tempAlt = alt;
		if(parameterToMap.paramNames[alt] == "" || GetParameter(parameterToMap.paramNames[alt]) == -1) {
			tempAlt = 0;
		}
		assignCCtoParameter(parameterToMap.cc, parameterToMap.channel, parameterToMap.paramNames[tempAlt]);
	}
}

//Assign parameters of Modifiers. Loops through the changedControls ccs and applies the
//modifiers alt to those ccs. If parameter isn't mapped, uses the default values. 
function assignParametersOfModifiers(modifier, controls, revertToDefault = false) {
	let tempAlt = modifier.alt;
	if(revertToDefault){
		Trace("Get Default");
		tempAlt = getDefault();
	}
	Trace("--New Parameters--")
	for(const parameterToMap of controls){
		for(const controlToChange of modifier.changedControls) {
			if(controlToChange.cc == parameterToMap.cc) {
				if(parameterToMap.paramNames[tempAlt] == "") 
						tempAlt = getDefault();
				Trace(parameterToMap.paramNames[tempAlt]);
				if(GetParameter(parameterToMap.paramNames[tempAlt]) != -1) {
					assignCCtoParameter(parameterToMap.cc, parameterToMap.channel, parameterToMap.paramNames[tempAlt]);
				}
			}
		}
	}
}

//Assigns the Parameter Name to a new parameter event, if no parameter is mapped to the
//cc then send the original event. 
//Apply the rangeTweaks math. 
function MapCCsToParameters(event) {
	let valueTweak = false;
	let value = 0;
	var newEvent = new TargetEvent;
	if(ppMapNames[event.channel-1][event.number] != undefined && GetParameter(ppMapNames[event.channel-1][event.number]) != -1 ) {
		newEvent.target = ppMapNames[event.channel-1][event.number];
		for(tweak of rangeTweaks){
			if(tweak.name == newEvent.target){
				value = tweak.math(event.value);
				valueTweak = true;
				break;
			}
		}
		if(valueTweak == false) {
			value = ccScale(event.value);
		}
		newEvent.value = value;
		displayNewEvent(ppMapNames[event.channel-1][event.number], newEvent.value, 100);
		Trace(newEvent);
		newEvent.send();
	}
	else {
		event.send();
	}
}

function displayNewEvent(eventName, eventValue, scale) {
	Trace("Target:" + eventName + " Value:" + (eventValue*scale).toFixed(1));
}


//Get a new default if a mute button is pressed. 
function getDefault(){

	for(i = 0; i < 8; i++){
		if(buttonState[41+i] == true) {
			return (i*2+3)
		}
	}
	return 0;
}
//Put a parameter name in ppMapNames for a cc and channel number.
function assignCCtoParameter(cc, channel, name) {
	ppMapNames[channel-1][cc] = name;
}

//Check if a cc is a button. Buttons are in the 40s, 50s, 70s and 80s.
function isButtonCC(event) {
	if(typeof event == "object") {
		return	(event.number >= 41 && event.number <= 58) ||
				(event.number >= 71 && event.number <= 88)
	}
	else if(Number.isInteger(event)) {
		return (event >= 41 && event <= 58 ) ||
			(event >= 71 && event <= 88 )
	}
	else 
		return false
}

function buttonOff(event) {
	if(typeof event == "object") 
		return (event.value == 0);
	else if(Number.isInteger(event))
		return (event == 0 );
	else
		return undefined
}

function buttonOn(event) {
	if(typeof event == "object")
		return (event.value == 127);
	else if(Number.isInteger(event))
		return (event == 127);
	else
		return undefined
}