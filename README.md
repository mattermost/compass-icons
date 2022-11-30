# Adding Icons

**NOTE: These docs need to be updated**

Simple steps to adding new icons to the Compass Icons font

## Adding Material Design Icons

#### Locate your icon

-   Go to https://materialdesignicons.com/ and search for the icon you want to add (stick to outline icon styles as per our [iconography](https://zeroheight.com/29be2c109/p/19c648-iconography) guide)
-   Download the icon as ".SVG Optimized"
- Open the SVG file in a text editor and copy the whole `<path />` tag
- Using the SVG code template below, replace `<path ADD PATH HERE />` with the path you've copied in the previous step
- Save the file

```SVG
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="24" height="24" viewBox="0 0 24 24"> 
    <path ADD PATH HERE />
</svg>
```

#### **Determine the Character code**

-   Locate the hexadecimal character code of the icon you just downloaded in the materialdesignicons.com [cheat sheet](https://cdn.materialdesignicons.com/5.3.45/) (use chromes find in page)

## Adding Custom Icons

#### Create your icon

-   Follow the design guide outlined under [Foundations / Iconography](https://zeroheight.com/29be2c109/p/19c648-iconography)
-   Once the icon is ready illustrator, be sure the shape is a single compound path, no extra layers or groups

#### Save and optimize your SVG

-   Choose to "Save As" an "SVG", ensuring to set the "Decimal Places" field is set to a value of "3" (This ensures your shapes are saved out with an accurate level of detail)
-   Click the "SVG Code..." button
-   Copy the entire <path> tag
-   Using the SVG code template below, replace `<path ADD PATH HERE />` with the path you've copied in the previous step

```SVG
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="24" height="24" viewBox="0 0 24 24"> 
    <path ADD PATH HERE />
</svg>
```

- Save the file as an .svg file

#### Naming your custom SVG

-   Try to match the naming conventions used in the material design icon open source [cheetsheet](https://cdn.materialdesignicons.com/5.3.45/)
-   if the icon is the same concept then consider it a replacement and reuse the name (minus the mdi prefix)
-   if its something new, do your best to try and match for example "someconcept-outline.svg" as it would likely follow the outline style

#### Choosing the character code

-   In the same way as the naming, try to reuse the hexadecimal codes in the [cheetsheet](https://cdn.materialdesignicons.com/5.3.45/) if its a replacement icon
-   For anything new we have manually started using the "E800" block of hexadecimal numbers
-   You'll have to open the [demo.html](https://drive.google.com/open?id=1fEKMDa3hdaAunc7g8-inVKxH50PGYymO&authuser=michael.gamble%40mattermost.com&usp=drive_fs) from the repository root and click on the "show codes" checkbox to determine which is the next available in the sequence
-   As you can see in the example above "E814" is the last icon in that "E800" block, so your icons character code should be "E815"

## Adding Jumbo Icons

#### Create your icon

-   Follow the design guide outlined under [Foundations / Iconography](https://zeroheight.com/29be2c109/p/19c648-iconography) (As of writing this Jumbo Icon design guides do not exist but will be included in future iterations - in the interim please consult with the UX Design Team)

#### Naming your jumbo SVG

-   Prefix your file name with "jumbo-" such as "jumbo-attachment-code"

#### Choosing the character code

-   Similar to the custom icons, we have designated the "E900" block of hexadecimal character codes for the jumbo icons.
-   If you open up the demo.html from the repository root and click on "show codes" you'll be able to look through the "E900" block to determine the next available code in the sequence.
-   As you can see in the example above "E90B" is the last icon in that "E900" block, so your icons character code should be "E90C"

## Rename the SVG

-   Append the identified hexadecimal character code to the filename after an underscore (_) character e.g. "account-outline_F0013.svg".

## Import into Github Repository

#### Upload your svg file to the SVG folder in the repository

-   In your browser navigate to the 'svgs' subfolder of the compass-icons repo
-   https://github.com/mattermost/compass-icons/tree/master/svgs
-   Click Add file > Upload files
-   Choose or drag your SVG file to add it to the repository
-   Fill out the commit description specifying what icon you are adding to the repository and why
-   When everything looks accurate, click on the green "Commit changes" button
-   Add any of designers the UX Team at Mattermost as a reviewer (e.g. @andrewbrown00, @mathewbirtch, @abhijit-singh, @anneliseklein, @michaelgamble)
-   When all the information looks accurate, click the green "Create pull request" button.

#### Font icon package creation

-   At this point you are waiting for the approval of the pull request
-   When the commit is approved by a member of the design team the font package will automatically be created and is ready to download for use (you will get a github notificaiton when approved)

#### Download font package

-   Navigate to the root of the compass-icon repository
-   https://github.com/mattermost/compass-icons/
-   Click on the "Actions" tab
-   Click on the latest "workflow run" that should match your commit title from the previous step.
-   Under the "Artifacts" section, you will see the "CompassIconFont" package, click it to download locally.

## Update the Google Drive Folder

-   In your local download folder, double click the file "CompassIconFont.zip" to extract the files
-   Cut, paste, and overwrite the contents of the archive into the [google drive folder](https://drive.google.com/open?id=1PbbhRVmXOI5BzC305qa42OjMtaVlLEYM&authuser=michael.gamble%40mattermost.com&usp=drive_fs).
-   Once the repository is updated, make a post in the Mattermost "[Compass Design System](https://community-daily.mattermost.com/core/channels/compass-design-system)" channel mentioning the "@uxteam" asking for the font to be updated in Figma
