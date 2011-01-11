// Constants:
module_name = 'zencoding';
module_ver = '@VERSION@';
menu_name = 'Zen Coding';

function Init() {
	addMenuItem('Expand Abbreviation', menu_name, 'zc_expandAbbreviation', 'Ctrl+,');
	addMenuItem('Wrap with Abbreviation', menu_name, 'zc_wrapWithAbbreviation', 'Ctrl+Shift+Alt+a');
	addMenuItem('Balance Tag', menu_name, 'zc_balanceTag', 'Ctrl+Alt+d');
	addMenuItem('Balance Tag Inward', menu_name, 'zc_balanceTagInward', 'Ctrl+Alt+Shift+d');
	addMenuItem('Merge Lines', menu_name, 'zc_mergeLines');
	addMenuItem('Next Edit Point', menu_name, 'zc_nextEditPoint');
	addMenuItem('Previous Edit Point', menu_name, 'zc_prevEditPoint');
	addMenuItem('Remove Tag', menu_name, 'zc_removeTag', 'Ctrl+\'');
	addMenuItem('Split/Join Tag', menu_name, 'zc_splitJoinTag', 'Ctrl+Alt+\'');
	addMenuItem('Toggle Comment', menu_name, 'zc_toggleComment', 'Ctrl+Alt+;');
}

function zc_expandAbbreviation() {
	return zc_manager('expand_abbreviation');
}

function zc_wrapWithAbbreviation() {
	return zc_manager('wrap_with_abbreviation');
}

function zc_balanceTag() {
	return zc_manager('match_pair_outward');
}

function zc_balanceTagInward() {
	return zc_manager('match_pair_inward');
}

function zc_mergeLines() {
	return zc_manager('merge_lines');
}

function zc_nextEditPoint() {
	return zc_manager('next_edit_point');
}

function zc_prevEditPoint() {
	return zc_manager('prev_edit_point');
}

function zc_removeTag() {
	return zc_manager('remove_tag');
}

function zc_splitJoinTag() {
	return zc_manager('split_join_tag');
}

function zc_toggleComment() {
	return zc_manager('toggle_comment');
}

function zc_manager(action_name) {
	var ed = newEditor();
	try {
		ed.assignActiveEditor();
	} catch(e) {
		return false;
	}
	
	zen_editor.setContext(ed);
	return zen_coding.runAction(action_name, zen_editor);
}
