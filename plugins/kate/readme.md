# Emmet under Kate (and other katepart programs) #

## Description ##

This is a plugin to enable Emmet for the Kate text editor (and other programs using the katepart text edit component). Kate has had an alternate rewritten version of the plugin called _Insane HTML Coding_ with only a subset of Emmet's features and some additional bugs - it has also been at version 0.1 for quite some time. This is a second attempt at bringing Zen Coding/Emmet to Kate.

## Installation ##

1. Copy the two files (in their respective directories) to your `.kde/share/apps/katepart` directory (use `$KDEHOME` instead of `.kde` if your distibution uses a custom directory).
2. Put a complete version of Emmet with all dependencies into the `api` directory
3. Assign shortcuts for Emmet actions using the `Settings -> Configure Shortcuts...` dialog (all actions begin with _Emmet_).

## Notes on implementation ##

Some of Emmet's actions are not used as Kate already has native support for them. Others are omitted because Kate's Javascript interface does not allow access to outside files.