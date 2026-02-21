Custom navigation bar userscript for the game Dead Frontier</p>

## Screenshots

<table>
  <tr>
    <td width="50%">
      <p align="center"><b>Navigation Bar</b></p>
      <img src="https://github.com/user-attachments/assets/2c99e212-1e48-4075-aaf1-0d371d4f8f4a" alt="Navigation Bar" />
    </td>
  </tr>
</table>

## Features

- **Custom Nav Bar** - Replaces the default navigation with a styled bar matching the game's visual theme
- **Quick Navigation** - One-click access to Marketplace, Bank, Storage, Crafting and more
- **Zone-aware Buttons** - The Yard and Vendor buttons unlock automatically when in an Inner City trade zone
- **CITY Button** - Navigates to the Inner City correctly from any page, not just the home page
- **Wiki Dropdown** - Hover the WIKI button for quick links to Weapons, Armour, Implants, City Map and more

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge) or [Greasemonkey](https://www.greasespot.net/) (Firefox)
2. Click here to install: https://greasyfork.org/en/scripts/567008-df-extrabuttons

## Security

- Does not make any external requests — all navigation stays within the game's own domain
- No credentials, tokens or personal data are stored or transmitted
- The only values saved locally (`GM_setValue`) are the player's trade zone and a one-time navigation flag, both used purely for UI behaviour
- Full source code is visible and auditable

## License

GPL-3.0
