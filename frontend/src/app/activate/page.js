import PageScaffold from "@/components/PageScaffold";

export const metadata = { title: "Activate Your TapLex", description: "Claim and activate your TapLex NFC wristband in a few simple steps." };

export default function ActivatePage(){return <PageScaffold page={{kicker:"Activation",title:"Activate your TapLex.",summary:"Enter the tag ID included with your wristband to claim it, create your profile, and start sharing.",actions:[{label:"Claim Your Device",href:"/claim/new",tone:"primary"},{label:"Get Setup Help",href:"/support",tone:"secondary"}],highlights:["Claim device","Build profile","Share instantly"],panels:[{title:"1. Claim",text:"Use the unique ID included with your official TapLex wristband."},{title:"2. Create",text:"Add your photo, bio, links, phone, email, website, and services."},{title:"3. Share",text:"Tap a compatible phone and open your live profile—no app required."}]}}/>}
