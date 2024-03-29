[![Version](https://img.shields.io/visual-studio-marketplace/v/playfab.playfab-explorer.svg)](https://marketplace.visualstudio.com/items?itemName=PlayFab.playfab-explorer) [![Installs](https://img.shields.io/visual-studio-marketplace/i/playfab.playfab-explorer.svg)](https://marketplace.visualstudio.com/items?itemName=PlayFab.playfab-explorer)

# PlayFab Explorer
The PlayFab Explorer extension provides a single PlayFab sign-in experience and tree view for all other PlayFab extensions, as well as some base functionality around titles and CloudScript.

## Commands

| Command |  |
| --- | --- |
| `PlayFab: Sign In`  | Sign in to your PlayFab account.
| `PlayFab: Sign Out` | Sign out of your PlayFab account.
| `PlayFab: Create an Account`  | If you don't have an PlayFab Account, you can [sign up](https://developer.playfab.com/en-US/sign-up) for one today.
| `PlayFab: Create a title`  | Create a new title.
| `PlayFab: Get title data` | Get data for a title.
| `PlayFab: Set title data` | Set or update data for a title.
| `PlayFab: Get internal title data` | Get internal data for a title.
| `PlayFab: Set internal title data` | Set or update internal data for a title.
| `PlayFab: List Functions` | List CloudScript Azure Functions for a title.
| `PlayFab: List HTTP Functions` | List HTTP triggered CloudScript Azure Functions for a title.
| `PlayFab: List Functions` | List Queue triggered CloudScript Azure Functions for a title.
| `PlayFab: Register HTTP Function` | Register an HTTP Triggered CloudScript Azure Function for a title.
| `PlayFab: Register Queued Function` | Register a Queue Triggered CloudScript Azure Function for a title.
| `PlayFab: Unregister Function` | Unregister a CloudScript Azure Function from a title.
| `PlayFab: Enable local debugging` | Enable local debugging of CloudScript Azure Functions.
| `PlayFab: Disable local debugging` | Disable local debugging of CloudScript Azure Functions.
| `PlayFab: Get CloudScript revision` | Get a revision for classic CloudScript for a title.
| `PlayFab: Update CloudScript` | Update classic CloudScript for a title.
| `PlayFab: Get entity profile` | Get profile for an entity
| `PlayFab: Open in Game Manager` | Open the PlayFab GameManager dashboard for a title.

## Settings

| Name | Description | Default |
| --- | --- | --- |
| playfab.showSignedInEmail | Whether to show the email address (e.g., in the status bar) of the signed in account. | true
| playfab.sortStudiosAlphabetically | Whether to sort studios alphabetically in the tree view. | true
| playfab.sortTitlesAlphabetically | Whether to sort titles alphabetically in the tree view. | true
| playfab.loginId | Account e-mail address | user@company.com
| playfab.jsonSpaces | Number of spaces to use when formatting JSON | 2
| playfab.cloudName | Private cloud name | 

## Sign-in

If you are not signed in to PlayFab, you will see a "Sign In to PlayFab..." link. Alternatively, you can select "View->Command Palette" in the VS Code menu, and search for "PlayFab: Sign In".

![Sign In to PlayFab](resources/SignIn.png)

If you don't have an PlayFab Account, you can sign up for one today for free by selecting "Create a PlayFab Account..." or selecting "View->Command Palette" and searching for "PlayFab: Create an Account".

You may sign out of PlayFab by selecting "View->Command Palette" and searching for "PlayFab: Sign Out".

## Running commands

Once you are signed in you can run a command via "View->Command Palette" in the VS Code manu and searching for "PlayFab". Alternatively, you can select a command by right-clicking on a studio or title in the extension tree view;

![Run Commands](resources/CommandTreeView.png)

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## License
[MIT](LICENSE.md)

The Visual Studio Code logo is under the [license](https://code.visualstudio.com/license) of the Visual Studio Code product.