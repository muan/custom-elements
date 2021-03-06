// Some of the js-test.js boilerplate will add stuff to the top of the document early
// enough to screw with frame offsets that are measured by the test.  Delay all that
// jazz until the actual test code is finished.
if (self.isJsTest) {
  setPrintTestResultsLazily();
  self.jsTestIsAsync = true;
}

// waitForNotification is a requestIdleCallback wrapped in a setTimeout wrapped in a
// requestAnimationFrame.  What in the wide, wide world of sports is going on here?
//
// Here's the order of events:
//
// - firstTestFunction
//   - Change layout to generate new IntersectionObserver notifications.
//   - waitForNotification(secondTestFunction)
//     - requestAnimationFrame
// - BeginFrame
//   - requestAnimationFrame handler runs.
//     - setTimeout
//   - FrameView::updateAllLifecyclePhases
//     - IntersectionObserver generates notification based on the new layout.
//       - Post idle task to deliver notification.
//   - setTimeout handler runs.
//     - testRunner.runIdleTasks or requestIdleCallback.
//   - Idle tasks run -- more or less immediately if (self.testRunner),
//     possibly delayed if (!self.testRunner).
//     - IntersectionObserver notifications are delivered.
//     - secondTestFunction
//       - Verify notifications generated by firstTestFunction.
//       - Change layout to generate new IntersectionObserver notifications.
//       - waitForNotification(thirdTestFunction)
//
// Note that this should work equally well in these operation conditions:
//
//   - layout test using single-threaded compositing (the default)
//   - layout test using multi-threaded compositing (virtual/threaded/)
//   - Not in a layout test and using multi-threaded compositing (the only configuration we ship)
function waitForNotification(f) {
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (self.testRunner)
        testRunner.runIdleTasks(f);
      else
        requestIdleCallback(f);
    });
  });
}

function rectToString(rect) {
  return "[" + rect.left + ", " + rect.right + ", " + rect.top + ", " + rect.bottom + "]";
}

function entryToString(entry) {
  var ratio = ((entry.intersectionRect.width * entry.intersectionRect.height) /
               (entry.boundingClientRect.width * entry.boundingClientRect.height));
  return (
      "boundingClientRect=" + rectToString(entry.boundingClientRect) + "\n" +
      "intersectionRect=" + rectToString(entry.intersectionRect) + "\n" +
      "visibleRatio=" + ratio + "\n" +
      "rootBounds=" + rectToString(entry.rootBounds) + "\n" +
      "target=" + entry.target + "\n" +
      "time=" + entry.time);
}

function rectArea(rect) {
  return (rect.left - rect.right) * (rect.bottom - rect.top);
}

function intersectionRatio(entry) {
  var targetArea = rectArea(entry.boundingClientRect);
  if (!targetArea)
    return 0;
  return rectArea(entry.intersectionRect) / targetArea;
}

function clientRectToJson(rect) {
  if (!rect)
    return null;
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height
  };
}

function coordinatesToClientRectJson(top, right, bottom, left) {
  return {
    top: top,
    right: right,
    bottom: bottom,
    left: left,
    width: right - left,
    height: bottom - top
  };
}

function entryToJson(entry) {
  return {
    boundingClientRect: clientRectToJson(entry.boundingClientRect),
    intersectionRect: clientRectToJson(entry.intersectionRect),
    rootBounds: clientRectToJson(entry.rootBounds),
    time: entry.time,
    target: entry.target.id
  };
}
