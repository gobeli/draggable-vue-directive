var ChangePositionType;
(function (ChangePositionType) {
    ChangePositionType[ChangePositionType["Start"] = 1] = "Start";
    ChangePositionType[ChangePositionType["End"] = 2] = "End";
    ChangePositionType[ChangePositionType["Move"] = 3] = "Move";
})(ChangePositionType || (ChangePositionType = {}));
function extractHandle(handle) {
    return handle && handle.$el || handle;
}
function getPosWithBoundaries(elementRect, boundingRect, left, top, boundingRectMargin = {}) {
    const adjustedPos = { left, top };
    const { height, width } = elementRect;
    const topRect = top, bottomRect = top + height, leftRect = left, rightRect = left + width;
    const marginTop = boundingRectMargin.top || 0, marginBottom = boundingRectMargin.bottom || 0, marginLeft = boundingRectMargin.left || 0, marginRight = boundingRectMargin.right || 0;
    const topBoundary = boundingRect.top + marginTop, bottomBoundary = boundingRect.bottom - marginBottom, leftBoundary = boundingRect.left + marginLeft, rightBoundary = boundingRect.right - marginRight;
    if (topRect < topBoundary) {
        adjustedPos.top = topBoundary;
    }
    else if (bottomRect > bottomBoundary) {
        adjustedPos.top = bottomBoundary - height;
    }
    if (leftRect < leftBoundary) {
        adjustedPos.left = leftBoundary;
    }
    else if (rightRect > rightBoundary) {
        adjustedPos.left = rightBoundary - width;
    }
    return adjustedPos;
}
export const Draggable = {
    bind(el, binding, vnode, oldVnode) {
        Draggable.update(el, binding, vnode, oldVnode);
    },
    update(el, binding, vnode, oldVnode) {
        if (binding.value && binding.value.stopDragging) {
            return;
        }
        const handler = (binding.value && binding.value.handle && extractHandle(binding.value.handle)) || el;
        if (binding && binding.value && binding.value.resetInitialPos) {
            initializeState();
            handlePositionChanged();
        }
        if (!handler.getAttribute("draggable")) {
            el.removeEventListener("mousedown", el["listener"]);
            if (binding.value.allowTouch) {
                el.removeEventListener("touchstart", el["listener"]);
                handler.addEventListener("touchstart", touchStart);
            }
            handler.addEventListener("mousedown", mouseDown);
            handler.setAttribute("draggable", "true");
            el["listener"] = mouseDown;
            initializeState();
            handlePositionChanged();
        }
        function touchMove(event) {
            const touch = event.touches[event.touches.length - 1];
            if (touch) {
                mouseMove(new MouseEvent("mousemove", { clientX: touch.clientX, clientY: touch.clientY }));
            }
        }
        function mouseMove(event) {
            event.preventDefault();
            const stopDragging = binding.value && binding.value.stopDragging;
            if (stopDragging) {
                return;
            }
            let state = getState();
            if (!state.startDragPosition || !state.initialMousePos) {
                initializeState(event);
                state = getState();
            }
            let dx = event.clientX - state.initialMousePos.left;
            let dy = event.clientY - state.initialMousePos.top;
            let currentDragPosition = {
                left: state.startDragPosition.left + dx,
                top: state.startDragPosition.top + dy
            };
            const boundingRect = getBoundingRect();
            const elementRect = el.getBoundingClientRect();
            if (boundingRect && elementRect) {
                currentDragPosition = getPosWithBoundaries(elementRect, boundingRect, currentDragPosition.left, currentDragPosition.top, binding.value.boundingRectMargin);
            }
            setState({ currentDragPosition });
            updateElementStyle();
            handlePositionChanged(event);
        }
        function getBoundingRect() {
            if (!binding.value) {
                return;
            }
            return binding.value.boundingRect
                || binding.value.boundingElement
                    && binding.value.boundingElement.getBoundingClientRect();
        }
        function updateElementStyle() {
            const state = getState();
            if (!state.currentDragPosition) {
                return;
            }
            el.style.position = "fixed";
            el.style.left = `${state.currentDragPosition.left}px`;
            el.style.top = `${state.currentDragPosition.top}px`;
        }
        function mouseUp(event) {
            event.preventDefault();
            const currentRectPosition = getRectPosition();
            setState({
                initialMousePos: undefined,
                startDragPosition: currentRectPosition,
                currentDragPosition: currentRectPosition
            });
            document.removeEventListener("mousemove", mouseMove);
            document.removeEventListener("mouseup", mouseUp);
            if (binding.value.allowTouch) {
                document.removeEventListener("touchmove", touchMove);
                document.removeEventListener("touchend", touchEnd);
            }
            handlePositionChanged(event, ChangePositionType.End);
        }
        function touchEnd(event) {
            const touch = event.changedTouches[event.changedTouches.length - 1];
            if (touch) {
                mouseUp(new MouseEvent('mouseup', { clientX: touch.clientX, clientY: touch.clientY }));
            }
        }
        function mouseDown(event) {
            setState({ initialMousePos: getInitialMousePosition(event) });
            handlePositionChanged(event, ChangePositionType.Start);
            document.addEventListener("mousemove", mouseMove);
            document.addEventListener("mouseup", mouseUp);
            if (binding.value.allowTouch) {
                document.addEventListener("touchmove", touchMove);
                document.addEventListener("touchend", touchEnd);
            }
        }
        function touchStart(event) {
            const touch = event.changedTouches[event.changedTouches.length - 1];
            if (touch) {
                mouseDown(new MouseEvent('mousedown', { clientX: touch.clientX, clientY: touch.clientY }));
            }
        }
        function getInitialMousePosition(event) {
            return event && {
                left: event.clientX,
                top: event.clientY
            };
        }
        function getRectPosition() {
            const clientRect = el.getBoundingClientRect();
            if (!clientRect.height || !clientRect.width) {
                return;
            }
            return { left: clientRect.left, top: clientRect.top };
        }
        function initializeState(event) {
            const state = getState();
            const initialRectPositionFromBinding = binding && binding.value && binding.value.initialPosition;
            const initialRectPositionFromState = state.initialPosition;
            const startingDragPosition = getRectPosition();
            const initialPosition = initialRectPositionFromBinding || initialRectPositionFromState || startingDragPosition;
            setState({
                initialPosition: initialPosition,
                startDragPosition: initialPosition,
                currentDragPosition: initialPosition,
                initialMousePos: getInitialMousePosition(event)
            });
            updateElementStyle();
        }
        function setState(partialState) {
            const prevState = getState();
            const state = Object.assign(Object.assign({}, prevState), partialState);
            handler.setAttribute("draggable-state", JSON.stringify(state));
        }
        function handlePositionChanged(event, changePositionType) {
            const state = getState();
            const posDiff = { x: 0, y: 0 };
            if (state.currentDragPosition && state.startDragPosition) {
                posDiff.x = state.currentDragPosition.left - state.startDragPosition.left;
                posDiff.y = state.currentDragPosition.top - state.startDragPosition.top;
            }
            const currentPosition = state.currentDragPosition && Object.assign({}, state.currentDragPosition);
            if (changePositionType === ChangePositionType.End) {
                binding.value && binding.value.onDragEnd && state && binding.value.onDragEnd(posDiff, currentPosition, event);
            }
            else if (changePositionType === ChangePositionType.Start) {
                binding.value && binding.value.onDragStart && state && binding.value.onDragStart(posDiff, currentPosition, event);
            }
            else {
                binding.value && binding.value.onPositionChange && state && binding.value.onPositionChange(posDiff, currentPosition, event);
            }
        }
        function getState() {
            return JSON.parse(handler.getAttribute("draggable-state")) || {};
        }
    }
};
