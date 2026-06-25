/**
 * main.js – browser interface for Circuit Conquest.
 *
 * This file is responsible for:
 *   - creating and updating the DOM;
 *   - translating user input into calls to the game module;
 *   - rendering game state into the interface.
 *
 * It contains NO game rules. All decisions about legality, winning, drawing
 * and turn-switching are delegated entirely to CircuitConquest.js.
 */

import {
    PLAYER_ONE,
    PLAYER_TWO,
    createGame,
    getCell,
    getCurrentPlayer,
    isValidMove,
    makeMove,
    getWinner,
    isDraw,
    isGameOver,
    restartGame
} from "./CircuitConquest.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const BOARD_SIZE = 7;

/**
 * Human-readable display names keyed by the module's player identifiers.
 * Using PLAYER_ONE / PLAYER_TWO as keys avoids duplicating the raw strings.
 */
const PLAYER_NAMES = Object.freeze({
    [PLAYER_ONE]: "Player One",
    [PLAYER_TWO]: "Player Two"
});

/**
 * Board symbols keyed by player identifier.
 * Symbols are used in status messages and as visible cell content.
 */
const PLAYER_MARKERS = Object.freeze({
    [PLAYER_ONE]: "▲",
    [PLAYER_TWO]: "■"
});

/**
 * Win-condition descriptions used in status messages.
 * Communicates the win through text, not colour alone.
 */
const WIN_DESCRIPTIONS = Object.freeze({
    [PLAYER_ONE]: "Connected top to bottom",
    [PLAYER_TWO]: "Connected left to right"
});

// ─── Module-level state ───────────────────────────────────────────────────────

/** The single controlled reference to the current immutable game state. */
let state = createGame();

/**
 * Tracks which cell holds tabIndex 0 (roving-tabindex pattern).
 * Arrow-key navigation moves these coordinates; render keeps them in sync.
 */
let focusRow = 0;
let focusCol = 0;

// ─── Cached DOM references (set once in init) ─────────────────────────────────

let boardEl;
let statusEl;
let restartBtn;
let playerOneCardEl;
let playerTwoCardEl;

/**
 * 2-D array [row][col] holding references to each cell button element.
 * Populated once by initBoard; reused on every render to avoid DOM teardown.
 */
let cellButtons;

// ─── Domain-to-display helpers ────────────────────────────────────────────────

/** Returns the display name for a player identifier. */
function humanPlayerName(player) {
    return PLAYER_NAMES[player] || "Unknown";
}

/** Returns the symbol character for a player identifier. */
function markerForPlayer(player) {
    return PLAYER_MARKERS[player] || "";
}

/**
 * Builds the accessible name for a single board cell.
 * Rows and columns are presented in one-based form to match human convention.
 * The symbol name ("triangle", "square") is included for non-visual users.
 */
function cellAccessibleName(cellValue, row, col) {
    const position = "Row " + (row + 1) + ", column " + (col + 1);
    if (!cellValue) {
        return position + ", empty";
    }
    if (cellValue === PLAYER_ONE) {
        return position + ", occupied by Player One, triangle";
    }
    return position + ", occupied by Player Two, square";
}

// ─── Board initialisation (called once) ──────────────────────────────────────

/**
 * Creates the 7-by-7 grid of button elements and attaches event listeners.
 * Uses DOM construction (createElement) rather than innerHTML strings.
 * The keydown listener is on the container, not individual buttons, so
 * arrow-key events from any cell bubble up to a single handler.
 */
function initBoard() {
    cellButtons = [];
    let r = 0;
    while (r < BOARD_SIZE) {
        cellButtons[r] = [];
        let c = 0;
        while (c < BOARD_SIZE) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.dataset.row = String(r);
            btn.dataset.col = String(c);
            btn.addEventListener("click", handleCellActivation);
            boardEl.appendChild(btn);
            cellButtons[r][c] = btn;
            c += 1;
        }
        r += 1;
    }
    boardEl.addEventListener("keydown", handleBoardKeydown);
}

// ─── Rendering ────────────────────────────────────────────────────────────────

/**
 * Updates a single cell button to match the current game state.
 * Reuses the existing element rather than recreating it so focus is retained.
 */
function updateCell(r, c) {
    const btn = cellButtons[r][c];
    const cellValue = getCell(state, r, c);
    const legal = isValidMove(state, r, c);

    /* Visible symbol: empty string for an empty cell. */
    btn.textContent = cellValue ? markerForPlayer(cellValue) : "";

    /* Accessible name overrides textContent for screen readers. */
    btn.setAttribute("aria-label", cellAccessibleName(cellValue, r, c));

    /*
     * Approach A: aria-disabled keeps all cells focusable so keyboard users
     * can explore the board even when it is partially or fully occupied.
     * handleCellActivation checks this attribute before placing a marker.
     */
    btn.setAttribute("aria-disabled", String(!legal));

    /* Roving tabindex: exactly one cell is reachable by Tab at a time. */
    btn.tabIndex = (r === focusRow && c === focusCol) ? 0 : -1;

    /* CSS classes reflect the cell's domain state, not raw strings. */
    btn.className = "cell";
    if (cellValue === PLAYER_ONE) { btn.classList.add("cell--one"); }
    if (cellValue === PLAYER_TWO) { btn.classList.add("cell--two"); }
}

/** Redraws every cell and updates the board container's state classes. */
function renderBoard() {
    let r = 0;
    while (r < BOARD_SIZE) {
        let c = 0;
        while (c < BOARD_SIZE) {
            updateCell(r, c);
            c += 1;
        }
        r += 1;
    }

    /* Board-level classes for post-game CSS styling */
    boardEl.classList.toggle("board--over", isGameOver(state));
    boardEl.classList.toggle("board--one-wins", getWinner(state) === PLAYER_ONE);
    boardEl.classList.toggle("board--two-wins", getWinner(state) === PLAYER_TWO);
}

/**
 * Updates the status bar and the player-card active/winner indicators.
 * The status bar has aria-live="polite" so changes are announced automatically.
 * Content uses symbols and text so it is not colour-dependent.
 */
function renderStatus() {
    const winner = getWinner(state);

    if (winner) {
        const name = humanPlayerName(winner);
        const marker = markerForPlayer(winner);
        const description = WIN_DESCRIPTIONS[winner];
        statusEl.textContent = marker + " " + name + " wins! " + description + ".";
    } else if (isDraw(state)) {
        statusEl.textContent = "Draw — the board is full.";
    } else {
        const player = getCurrentPlayer(state);
        const name = humanPlayerName(player);
        const marker = markerForPlayer(player);
        statusEl.textContent = marker + " " + name + "'s turn";
    }
}

/**
 * Updates the active/winner highlighting on the player identity cards.
 * This is purely cosmetic and reinforces what the status bar already says.
 */
function renderPlayerCards() {
    const gameOver = isGameOver(state);
    const winner = getWinner(state);
    const current = getCurrentPlayer(state);

    const isActiveOne = !gameOver && current === PLAYER_ONE;
    const isActiveTwo = !gameOver && current === PLAYER_TWO;

    playerOneCardEl.classList.toggle("player-card--active", isActiveOne);
    playerTwoCardEl.classList.toggle("player-card--active", isActiveTwo);
    playerOneCardEl.classList.toggle("player-card--winner", winner === PLAYER_ONE);
    playerTwoCardEl.classList.toggle("player-card--winner", winner === PLAYER_TWO);

    playerOneCardEl.setAttribute("aria-current", String(isActiveOne));
    playerTwoCardEl.setAttribute("aria-current", String(isActiveTwo));
}

/** Full render pass: board + status bar + player cards. */
function render() {
    renderBoard();
    renderStatus();
    renderPlayerCards();
}

// ─── Focus management ─────────────────────────────────────────────────────────

/**
 * Moves the roving tabindex and keyboard focus to the cell at (r, c).
 * Called only by the arrow-key handler; does not trigger a full re-render.
 */
function setRovingFocus(r, c) {
    cellButtons[focusRow][focusCol].tabIndex = -1;
    focusRow = r;
    focusCol = c;
    const next = cellButtons[focusRow][focusCol];
    next.tabIndex = 0;
    next.focus();
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * Handles click (and Enter / Space via native button behaviour) on a cell.
 * Reads row and column from data attributes, delegates the move to the game
 * module, and re-renders if the state changed.
 */
function handleCellActivation(event) {
    const btn = event.currentTarget;

    /* Silently ignore activations on aria-disabled cells (occupied or game over). */
    if (btn.getAttribute("aria-disabled") === "true") {
        return;
    }

    const row = Number(btn.dataset.row);
    const col = Number(btn.dataset.col);

    const nextState = makeMove(state, row, col);

    /* makeMove returns the original reference when the move is invalid. */
    if (nextState === state) {
        return;
    }

    state = nextState;
    focusRow = row;
    focusCol = col;
    render();

    /* Restore focus to the cell that was just played after re-render. */
    cellButtons[focusRow][focusCol].focus();
}

/**
 * Handles arrow-key navigation within the board container.
 * Arrow keys move the roving focus one cell in the pressed direction.
 * Page scrolling is prevented only when the key successfully moves focus
 * within the board; at edges, the key behaves normally.
 *
 * Enter and Space are native button activations and are handled via click.
 */
function handleBoardKeydown(event) {
    const key = event.key;

    if (key !== "ArrowUp" && key !== "ArrowDown" &&
            key !== "ArrowLeft" && key !== "ArrowRight") {
        return;
    }

    let newRow = focusRow;
    let newCol = focusCol;

    if (key === "ArrowUp")    { newRow -= 1; }
    if (key === "ArrowDown")  { newRow += 1; }
    if (key === "ArrowLeft")  { newCol -= 1; }
    if (key === "ArrowRight") { newCol += 1; }

    /* Do not wrap at edges; return without preventing default. */
    if (newRow < 0 || newRow >= BOARD_SIZE ||
            newCol < 0 || newCol >= BOARD_SIZE) {
        return;
    }

    /* Only prevent page scroll when focus successfully moves within the board. */
    event.preventDefault();
    setRovingFocus(newRow, newCol);
}

/**
 * Handles the Restart button.
 * Calls restartGame (a game-module function) to obtain a completely fresh
 * state, then re-renders and returns focus to the first board cell.
 */
function handleRestart() {
    state = restartGame(state);
    focusRow = 0;
    focusCol = 0;
    render();
    cellButtons[0][0].focus();
}

// ─── Initialisation ───────────────────────────────────────────────────────────

/** Caches DOM references, builds the board, and performs the first render. */
function init() {
    boardEl         = document.getElementById("board");
    statusEl        = document.getElementById("status");
    restartBtn      = document.getElementById("restart-btn");
    playerOneCardEl = document.getElementById("player-one-card");
    playerTwoCardEl = document.getElementById("player-two-card");

    initBoard();
    render();

    restartBtn.addEventListener("click", handleRestart);
}

/*
 * ES modules are deferred by default, so the DOM is always ready when
 * this module executes. DOMContentLoaded is included for clarity.
 */
document.addEventListener("DOMContentLoaded", init);
