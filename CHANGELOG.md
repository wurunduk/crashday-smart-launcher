# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

## [Unreleased]
### Added
### Changed
### Fixed

## [1.7.1, 1.7.2] 2020-09-23
Fixed build errors?

## [1.7.0] 2020-09-23
### Added
- Added item previews.
- Added item reordering.
- List of missing from collection mods now has a link to open mod in steam directly.
- 'f5' or 'ctrl+r' will reload the launcher now.
### Changed
- Formatted amount of mods text.
### Fixed
- Fixed broken config creation if a mod with non numbered .cpk was present in mods folder (thanks Mica).
- Fixed some new unscanned mods breaking launcher.config.

## [1.6.1] 2020-01-19
### Added
- Removed Tools tab

## [1.6.0] 2020-01-19
### Added
- Added auto-updates
- Collections are now sorted by enabled by default

## [1.4.2] 2020-01-19
### Added
- Added more action notifications.
- If a collection has some mods which are unavailable on current machine, a warning will be printed. You will also be able to view a list of not subscribed mods.
- Made the app start maximized.
- Made mod list tables a bit cleaner.
### Fixed
- Fixed crashday path saving (Hopefully i did)

## [1.4.1] - 2020-01-12
### Fixed
- Collections imported from steam link will be properly saved.
- Turning off mods on Collections page actually does turn them off now.
- Fixed crashday path saving (Specify it again)

## [1.4.0] - 2020-01-12
### Added
- Added in-app notifications if anything goes wrong.
- Added mod scanning so newly subscribed mods would appear without launching the original launcher.
⋅⋅* You need to specify Crashday installation path for this to work.
- Enabling collections does not disable all other mods now.
- Added "disable mods" to the collections page.
- Added item id sorting
- Added item id to Collections page
### Fixed
- Wrong file downloading when new version is found.
- Some design fixes and optimizations. 
- Current Collection is now highlighted in Collections list.

## [1.3.0] - 2019-12-29
### Added
- You can now add a collection from steam link\id
### Fixed
- Collections are now saved in a separate collections.config file, so Crashday will not rewrite those

Happy new year everyone.

## [1.2.0] - 2019-07-01
### Added
- Added collections to easily enable/disable big amounts of mods
- Added back to top button
- Added notifications if an update was found
- Fixed selected mod amount counter

## [1.1.1] - 2019-06-27
### Added
- Only a single instance of launcher will now be opened

## [1.1.0] - 2019-06-27
## Added
- Mods are now colored depending on the type
- Added total and activated amount of mods(it's bugged when selecting multiple mods, i know)
- Added missing "Disable mods" button
- Added icon to indicate loading at the start

## [1.0.0] - 2019-06-27
### Added
- First release
