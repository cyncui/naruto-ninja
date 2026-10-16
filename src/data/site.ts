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
      body: "Switch to Camera mode, start the camera and practise as usual. When the next seal has not been taught yet, practice pauses on it: make the seal and hold still, and three samples are captured automatically before the step is accepted. Then switch to the next seal; teaching waits until your hands change pose. Calibration is still there to re-teach a seal or clear your samples, and opening it never resets your progress.",
      note: "Recognition is an experimental nearest-example prototype. Interlocked fingers are estimated rather than seen, so similar seals can be confused; motion gestures are not solved. Tracking your hands does not automatically identify a Naruto sign.",
    },
    {
      title: "Know what you’re seeing.",
      body: "The library contains 81 researched techniques and 95 activation variants. Source & notes lets you compare reported variants and open their references. Exact sequences are secondary-reported and have not been checked against original scenes. Some techniques have no seals, and others have an unresolved sequence.",
      note: "Effects and the practice figure are original illustrations. Zodiac characters label the seals; they are not hand-position diagrams. Previewing an effect does not count as a recognized sequence.",
    },
  ],
};
