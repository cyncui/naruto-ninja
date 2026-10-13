export const site = {
  name: "Naruto Ninja",
  url: import.meta.env.VITE_SITE_URL?.replace(/\/$/, "") || "",
  description:
    "Your own shinobi training room. Practice Naruto hand-seal sequences, teach local hand tracking and preview original chakra effects.",
  guide: [
    {
      title: "Rehearse the sequence.",
      body: "Demo rehearses the order of your taps. Use a pose reference you trust for hand shapes. Choose a technique from the library, then tap its numbered signs in order. Each accepted sign charges the circle. Repeated signs count as separate steps; completing the sequence plays the effect. Reset whenever you want to begin again.",
      note: "Demo is untimed, so take your time learning. In Camera mode, an eight-second pause resets your sequence.",
    },
    {
      title: "Teach your hands.",
      body: "Start the camera, wait for the tracker to become ready, then open Calibration. Choose a seal and capture at least three examples with small pose variations. Keep both hands visible. The capture timer gives you three seconds to get into position.",
      note: "Recognition is an experimental nearest-example prototype. Interlocked fingers, motion gestures and one-handed signs are not solved. Tracking your hands does not automatically identify a Naruto sign.",
    },
    {
      title: "Know what you’re seeing.",
      body: "The library contains 81 researched techniques and 95 activation variants. Source & notes lets you compare reported variants and open their references. Exact sequences are secondary-reported and have not been checked against original scenes. Some techniques have no seals, and others have an unresolved sequence.",
      note: "Effects and the practice figure are original illustrations. Zodiac characters label the seals; they are not hand-position diagrams. Previewing an effect does not count as a recognized sequence.",
    },
  ],
};
