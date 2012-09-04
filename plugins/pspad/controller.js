// Constants:
module_name = 'emmet';
module_ver = '@VERSION@';
menu_name = 'Emmet';

function Init() {
	// TODO read action names from 'actions' module
	addMenuItem('Expand Abbreviation', menu_name, 'emmet_expandAbbreviation', 'Ctrl+,');
	addMenuItem('Wrap with Abbreviation', menu_name, 'emmet_wrapWithAbbreviation', 'Ctrl+Shift+Alt+a');
	addMenuItem('Balance Tag', menu_name, 'emmet_balanceTag', 'Ctrl+Alt+d');
	addMenuItem('Balance Tag Inward', menu_name, 'emmet_balanceTagInward', 'Ctrl+Alt+Shift+d');
	addMenuItem('Merge Lines', menu_name, 'emmet_mergeLines');
	addMenuItem('Next Edit Point', menu_name, 'emmet_nextEditPoint');
	addMenuItem('Previous Edit Point', menu_name, 'emmet_prevEditPoint');
	addMenuItem('Remove Tag', menu_name, 'emmet_removeTag', 'Ctrl+\'');
	addMenuItem('Split/Join Tag', menu_name, 'emmet_splitJoinTag', 'Ctrl+Alt+\'');
	addMenuItem('Toggle Comment', menu_name, 'emmet_toggleComment', 'Ctrl+Alt+;');
	
	// v0.7
	addMenuItem('Evaluate Math Expression', menu_name, 'emmet_evaluateMath', 'Ctrl+y');
	addMenuItem('Increment number by 1', menu_name, 'emmet_incrementBy1', 'Ctrl+up');
	addMenuItem('Decrement number by 1', menu_name, 'emmet_decrementBy1', 'Ctrl+down');
	addMenuItem('Increment number by 0.1', menu_name, 'emmet_incrementBy01', 'Alt+up');
	addMenuItem('Decrement number by 0.1', menu_name, 'emmet_decrementBy01', 'Alt+down');
	addMenuItem('Increment number by 10', menu_name, 'emmet_incrementBy10', 'Ctrl+Alt+up');
	addMenuItem('Decrement number by 10', menu_name, 'emmet_decrementBy10', 'Ctrl+Alt+down');
	
	addMenuItem('Select Next Item', menu_name, 'emmet_selectNextItem', 'Ctrl+.');
	addMenuItem('Select Previous Item', menu_name, 'emmet_selectPrevItem', 'Ctrl+Shift+.');
	addMenuItem('Reflect CSS Value', menu_name, 'emmet_reflectCSS', 'Ctrl+Shift+B');
}

function emmet_expandAbbreviation() {
	return emmet_manager('expand_abbreviation');
}

function emmet_wrapWithAbbreviation() {
	return emmet_manager('wrap_with_abbreviation');
}

function emmet_balanceTag() {
	return emmet_manager('match_pair_outward');
}

function emmet_balanceTagInward() {
	return emmet_manager('match_pair_inward');
}

function emmet_mergeLines() {
	return emmet_manager('merge_lines');
}

function emmet_nextEditPoint() {
	return emmet_manager('next_edit_point');
}

function emmet_prevEditPoint() {
	return emmet_manager('prev_edit_point');
}

function emmet_removeTag() {
	return emmet_manager('remove_tag');
}

function emmet_splitJoinTag() {
	return emmet_manager('split_join_tag');
}

function emmet_toggleComment() {
	return emmet_manager('toggle_comment');
}

function emmet_evaluateMath() {
	return emmet_manager('evaluate_math_expression');
}

function emmet_incrementBy1() {
	return emmet_manager('increment_number_by_1');
}

function emmet_decrementBy1() {
	return emmet_manager('decrement_number_by_1');
}

function emmet_incrementBy01() {
	return emmet_manager('increment_number_by_01');
}

function emmet_decrementBy01() {
	return emmet_manager('decrement_number_by_01');
}

function emmet_incrementBy10() {
	return emmet_manager('increment_number_by_10');
}

function emmet_decrementBy10() {
	return emmet_manager('decrement_number_by_10');
}

function emmet_selectNextItem() {
	return emmet_manager('select_next_item');
}

function emmet_selectPrevItem() {
	return emmet_manager('select_previous_item');
}

function emmet_reflectCSS() {
	return emmet_manager('reflect_css_value');
}

function emmet_manager(actionName) {
	var ed = newEditor();
	try {
		ed.assignActiveEditor();
	} catch(e) {
		return false;
	}
	
	editorProxy.setContext(ed);
	return emmet.require('actions').run(actionName, editorProxy);
}
