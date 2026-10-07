# Changelog

## 0.5.0 (2026-10-07)

### Features

- **ui:** WeatherChip can leave its forecast drawer out (#71) ([d106662](https://github.com/dstoyanoff/hashsome/commit/d106662bc1d3bea5217b96fa44b347cbfadcccf3))
- **ui:** the player bar can open the library and the queue as overlays of their own (#69) ([2d1df6f](https://github.com/dstoyanoff/hashsome/commit/2d1df6f0c996ea4d7e8ee45c1855c5874c592176))
- **ui:** the small player's artwork ring shows how far playback has gone (#68) ([d5baec6](https://github.com/dstoyanoff/hashsome/commit/d5baec6b27f9cba2a1680ad8cadccb1c28b82a2b))
- **ui:** the player bar can skip its drawer, or send the hold to a page (#66) ([efdd449](https://github.com/dstoyanoff/hashsome/commit/efdd449b2c3cd27a8271ba093244b55d726942ee))
- **ui:** a device can turn animations off with ?motion=reduced (#65) ([7ed5e76](https://github.com/dstoyanoff/hashsome/commit/7ed5e76bd49eee7a9c488b6d61e55b961327c952))
- **ui:** LightTile can leave its drawer out (#62) ([483e95a](https://github.com/dstoyanoff/hashsome/commit/483e95a09c8672d2fe32ee0042ae11b62991dc80))
- **ui:** the media player bar is two rows in a narrow space, or when asked (#58) ([3419b02](https://github.com/dstoyanoff/hashsome/commit/3419b028b887c349e3d2f55c7a7bf98a7679923e))
- **ui:** AnimatedOutlet gives a dashboard's pages a transition (#60) ([a8b5a16](https://github.com/dstoyanoff/hashsome/commit/a8b5a1666165b19e4f190284ba8e7c8b3261621a))
- **runtime:** homeAssistantCompat lets a wall display that only opens a Home Assistant accept a Hashsome server (#56) ([f191274](https://github.com/dstoyanoff/hashsome/commit/f191274c286e743678491334f5ccc69008035f08))
- **ui:** the top bar's date, weather and clock are components of their own (#55) ([3637302](https://github.com/dstoyanoff/hashsome/commit/36373028208c507d13e19f61f21903e78cf2d20f))
- **ui:** the theme can follow the time of day, by the clock or by the sun (#54) ([cf5d9db](https://github.com/dstoyanoff/hashsome/commit/cf5d9dbb67ff562f950154d1ca97fb5a2926281e))
- **ui:** a calmer orange is the dark theme's accent (#53) ([30e88bd](https://github.com/dstoyanoff/hashsome/commit/30e88bda74598e63fd856a323bb1d25998c50387))

### Fixes

- **ui:** a touch that never ends cannot freeze the playback position (#70) ([264a330](https://github.com/dstoyanoff/hashsome/commit/264a33010dea53820f63747b8d696a70f93ec1f9))
- **ui:** a card that mounts is drawn as it is, not animated in from nothing (#64) ([e5b0fc1](https://github.com/dstoyanoff/hashsome/commit/e5b0fc1b76f78dd3ed7e626be32fe919d7e62cb0))
- **ui:** the nav dock's active marker is a circle, like the pill around it (#59) ([65cd965](https://github.com/dstoyanoff/hashsome/commit/65cd9656a032ad83a3b262a561879ce759d04df1))
- **ui:** the nav dock's shadow is softer (#57) ([15d7d93](https://github.com/dstoyanoff/hashsome/commit/15d7d93d367b4333b4e2ff80e787f14b0e93e891))

### Performance

- **ui:** the hold line is a CSS transform animation, not a width animated from JavaScript (#63) ([ca93aec](https://github.com/dstoyanoff/hashsome/commit/ca93aec9997db0d51940c679a9f0a6363ff8e609))

## 0.4.0 (2026-10-06)

### Features

- **runtime:** a page left open reloads when a newer build is being served (#51) ([c60adad](https://github.com/dstoyanoff/hashsome/commit/c60adad39a1d1f7ca281bec2c7c6214f9c6f6019))

### Fixes

- **ui:** the weather pill's reading and its high and low are centred on their digits (#52) ([956a4b7](https://github.com/dstoyanoff/hashsome/commit/956a4b7e0cbfa4e00d701cb139c705f7b5236646))

## 0.3.0 (2026-10-06)

### Features

- **ui:** the weather's hours are one scrolling row, without a box each (#50) ([ac68b8b](https://github.com/dstoyanoff/hashsome/commit/ac68b8bbc7c822405eed0a8e885521895f2ea556))
- **ui:** the weather readings are outlined boxes with a smaller radius (#49) ([e0d6a3d](https://github.com/dstoyanoff/hashsome/commit/e0d6a3df5b5f33ee2e5f500769f93536323f6784))
- the queue beside the player, and play, play next and add to queue in the library (#47) ([9ccabe9](https://github.com/dstoyanoff/hashsome/commit/9ccabe94715c7379f56b37cab92f80587d0f3478))

### Fixes

- **ui:** chart grid lines are lighter, and the bottom one is solid (#48) ([dec2734](https://github.com/dstoyanoff/hashsome/commit/dec27342247c9662de7b35cca89cf9cc8851da45))

## 0.2.0 (2026-10-06)

### ⚠ Breaking changes

- **ui:** MediaPlayerPage becomes MediaPlayerFull, a widget a dashboard puts in its own page (#41) ([886280c](https://github.com/dstoyanoff/hashsome/commit/886280c3afa602b07f5ae6750b89f05223bf2c5c))

### Features

- recent activity (the logbook) in the light and climate drawers (#43) ([7136461](https://github.com/dstoyanoff/hashsome/commit/7136461cb9f14a220088c8a4c28f6a8f8122413b))
- weather forecast in the top bar's weather chip (#38) ([8ae932c](https://github.com/dstoyanoff/hashsome/commit/8ae932c6c234154520f0451ac74d957f9131d22e))
- **runtime:** hashsome upgrade moves a project's @hashsome packages to the latest release (#39) ([708d704](https://github.com/dstoyanoff/hashsome/commit/708d704cf2a61c07969e96d771183d367ae6e2c5))
- **core:** mock devices invent power and energy history (#36) ([58db72d](https://github.com/dstoyanoff/hashsome/commit/58db72d0a3326600cb4aa3a2e18716c8ed409a8d))

### Fixes

- the release script bumps from the last tag, not the root package version (#45) ([dd19afd](https://github.com/dstoyanoff/hashsome/commit/dd19afd051fdbffe30544fc9d736a4c44718f2b5))
- **ui:** dashboard switcher entries are as tall as its button, for touch screens (#44) ([9e90033](https://github.com/dstoyanoff/hashsome/commit/9e90033c0d6c5db747bea1a87503add6b92f2558))
- **ui:** library cards shrink to fit instead of being cut off (#37) ([9de9c5f](https://github.com/dstoyanoff/hashsome/commit/9de9c5f050714159630f00860c7e59b69f51d068))
