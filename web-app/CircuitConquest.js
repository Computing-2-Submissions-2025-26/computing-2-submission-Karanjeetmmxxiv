/**
 * @module CircuitConquest
 * @description
 * Game module for Circuit Conquest – a local two-player connection strategy
 * game played on a square grid.
 *
 * **Player One (▲)** must form a continuous orthogonal path from the top
 * edge of the board (row 0) to the bottom edge (row size − 1).
 *
 * **Player Two (■)** must form a continuous orthogonal path from the left
 * edge of the board (column 0) to the right edge (column size − 1).
 *
 * Players alternate turns, placing one marker per turn in any empty cell.
 * The first player to complete their crossing path wins.
 * If every cell is filled without a winner the game is a draw.
 *
 * All exported functions are **pure**: they do not modify their arguments,
 * do not access the DOM, and do not use any external mutable state.
 * State-transition functions return a new {@link GameState} object;
 * state-query functions return information derived from the supplied state.
 */

/**
 * The identifier for Player One, who plays the ▲ symbol and wins by
 * connecting the top edge to the bottom edge.
 * @constant {string}
 */
const PLAYER_ONE = "playerOne";

/**
 * The identifier for Player Two, who plays the ■ symbol and wins by
 * connecting the left edge to the right edge.
 * @constant {string}
 */
const PLAYER_TWO = "playerTwo";

// Internal status constants – not exported; callers use getGameStatus / isGameOver.
const STATUS_PLAYING = "playing";
const STATUS_WON = "won";
const STATUS_DRAW = "draw";

// ─── Typedef ──────────────────────────────────────────────────────────────────

/**
 * A plain object that represents the complete, immutable state of one game.
 * State-transition functions return a **new** object; the original is never
 * modified.
 *
 * @typedef  {Object}  GameState
 * @property {number}  size
 *   Side length of the square board (e.g. 7 gives a 7 × 7 grid).
 * @property {Array<Array<string|null>>} board
 *   Two-dimensional array indexed as `board[row][column]`.
 *   Row 0 is the top edge; row `size − 1` is the bottom edge.
 *   Column 0 is the left edge; column `size − 1` is the right edge.
 *   Each cell is `null` (empty), `"playerOne"`, or `"playerTwo"`.
 * @property {"playerOne"|"playerTwo"} currentPlayer
 *   The player whose turn it is.
 * @property {"playerOne"|"playerTwo"|null} winner
 *   The winning player, or `null` when no player has won yet.
 * @property {"playing"|"won"|"draw"} status
 *   Current phase of the game.
 * @property {number} moveCount
 *   Total number of moves made since the game began.
 */

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Returns the opponent of the given player.
 * @private
 * @param {string} player
 * @returns {string}
 */
const opponentOf = function (player) {
    return player === PLAYER_ONE ? PLAYER_TWO : PLAYER_ONE;
};

/**
 * Returns true when the coordinates are integers within the board boundary.
 * @private
 * @param {GameState} state
 * @param {number} row
 * @param {number} column
 * @returns {boolean}
 */
const inBounds = function (state, row, column) {
    return (
        Number.isInteger(row) &&
        Number.isInteger(column) &&
        row >= 0 &&
        row < state.size &&
        column >= 0 &&
        column < state.size
    );
};

// ─── State-query functions ────────────────────────────────────────────────────

/**
 * Returns a defensive copy of the board so that callers cannot accidentally
 * mutate the game state by modifying the returned array.
 * Each row is a new array containing the same cell values.
 *
 * @param {GameState} state - The current game state.
 * @returns {Array<Array<string|null>>} A copy of the board.
 */
const getBoard = function (state) {
    return state.board.map(function (row) {
        return row.slice();
    });
};

/**
 * Returns the identifier of the player whose turn it is.
 *
 * @param {GameState} state - The current game state.
 * @returns {"playerOne"|"playerTwo"} The current player.
 */
const getCurrentPlayer = function (state) {
    return state.currentPlayer;
};

/**
 * Returns the contents of a single board cell.
 *
 * Returns `undefined` when the coordinates are out of bounds or non-integer,
 * so that callers can distinguish an **empty cell** (`null`) from an
 * **invalid coordinate** (`undefined`).
 *
 * @param {GameState} state    - The current game state.
 * @param {number}    row      - Zero-based row index (0 = top edge).
 * @param {number}    column   - Zero-based column index (0 = left edge).
 * @returns {string|null|undefined}
 *   `"playerOne"`, `"playerTwo"`, `null` (empty), or `undefined` (invalid).
 */
const getCell = function (state, row, column) {
    if (!inBounds(state, row, column)) {
        return undefined;
    }
    return state.board[row][column];
};

/**
 * Returns whether placing a marker at `(row, column)` would be a legal move
 * in the current state.
 *
 * A move is legal if and only if:
 * - the game is still in progress (status is `"playing"`);
 * - both coordinates are integers within the board boundaries;
 * - the target cell is empty (`null`).
 *
 * @param {GameState} state  - The current game state.
 * @param {number}    row    - Zero-based row index.
 * @param {number}    column - Zero-based column index.
 * @returns {boolean}
 */
const isValidMove = function (state, row, column) {
    if (state.status !== STATUS_PLAYING) {
        return false;
    }
    if (!inBounds(state, row, column)) {
        return false;
    }
    return state.board[row][column] === null;
};

/**
 * Returns every legal move available to the current player.
 * Each move is described as a plain object with `row` and `column` properties.
 * Returns an empty array when the game is over.
 *
 * @param {GameState} state - The current game state.
 * @returns {Array<{row: number, column: number}>}
 */
const getLegalMoves = function (state) {
    if (state.status !== STATUS_PLAYING) {
        return [];
    }
    const moves = [];
    state.board.forEach(function (row, r) {
        row.forEach(function (cell, c) {
            if (cell === null) {
                moves.push({row: r, column: c});
            }
        });
    });
    return moves;
};

/**
 * Returns the winning player, or `null` if neither player has won yet.
 *
 * @param {GameState} state - The current game state.
 * @returns {"playerOne"|"playerTwo"|null}
 */
const getWinner = function (state) {
    return state.winner;
};

/**
 * Returns whether the game has ended in a draw.
 * A draw occurs when every cell is occupied and neither player has won.
 *
 * @param {GameState} state - The current game state.
 * @returns {boolean}
 */
const isDraw = function (state) {
    return state.status === STATUS_DRAW;
};

/**
 * Returns whether the game is over (either won or drawn).
 * No further moves may be made once this returns `true`.
 *
 * @param {GameState} state - The current game state.
 * @returns {boolean}
 */
const isGameOver = function (state) {
    return state.status !== STATUS_PLAYING;
};

/**
 * Returns a human-readable string describing the current game situation.
 *
 * Possible return values:
 * - `"playerOne to move"` – it is Player One's turn.
 * - `"playerTwo to move"` – it is Player Two's turn.
 * - `"playerOne wins"`    – Player One has connected top to bottom.
 * - `"playerTwo wins"`    – Player Two has connected left to right.
 * - `"draw"`              – The board is full with no winner.
 *
 * @param {GameState} state - The current game state.
 * @returns {string}
 */
const getGameStatus = function (state) {
    if (state.status === STATUS_WON) {
        return `${state.winner} wins`;
    }
    if (state.status === STATUS_DRAW) {
        return "draw";
    }
    return `${state.currentPlayer} to move`;
};

// ─── Win detection ────────────────────────────────────────────────────────────

/**
 * Returns whether `player` has formed a continuous orthogonal path between
 * their two target edges using a breadth-first flood fill.
 *
 * - Player One must connect row 0 (top) to row `size − 1` (bottom).
 * - Player Two must connect column 0 (left) to column `size − 1` (right).
 *
 * Only orthogonal neighbours (up, down, left, right) count as connected;
 * diagonal adjacency does not create a connection.
 *
 * @param {GameState}              state  - The current game state.
 * @param {"playerOne"|"playerTwo"} player - The player to check.
 * @returns {boolean} `true` if the player has a winning path.
 */
const hasWinningPath = function (state, player) {
    const {size, board} = state;

    // Determine which cells form the starting edge and which index to test for the goal.
    // playerOne starts at row 0 and targets row size-1.
    // playerTwo starts at column 0 and targets column size-1.
    const isPlayerOne = player === PLAYER_ONE;

    // Collect starting cells (all cells on the near edge owned by this player).
    const queue = [];
    const visited = Array.from({length: size}, function () {
        return Array(size).fill(false);
    });

    let r = 0;
    while (r < size) {
        const startRow = isPlayerOne ? 0 : r;
        const startCol = isPlayerOne ? r : 0;
        if (board[startRow][startCol] === player) {
            queue.push([startRow, startCol]);
            visited[startRow][startCol] = true;
        }
        r += 1;
    }

    // Orthogonal directions: [row-delta, col-delta]
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    let head = 0;
    while (head < queue.length) {
        const current = queue[head];
        const cr = current[0];
        const cc = current[1];
        head += 1;

        // Check whether this cell is on the far edge.
        const onFarEdge = isPlayerOne ? cr === size - 1 : cc === size - 1;
        if (onFarEdge) {
            return true;
        }

        // Enqueue unvisited neighbours owned by the same player.
        let d = 0;
        while (d < directions.length) {
            const nr = cr + directions[d][0];
            const nc = cc + directions[d][1];
            if (
                nr >= 0 && nr < size &&
                nc >= 0 && nc < size &&
                !visited[nr][nc] &&
                board[nr][nc] === player
            ) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
            }
            d += 1;
        }
    }

    return false;
};

// ─── State-transition functions ───────────────────────────────────────────────

/**
 * Creates and returns a fresh initial game state.
 * Every cell is `null` (empty) and Player One moves first.
 *
 * @param {number} [size=7]
 *   Side length of the square board. Must be a positive integer.
 *   The default value of 7 gives the standard 7 × 7 grid.
 * @returns {GameState} A new game state ready for play.
 */
const createGame = function (size = 7) {
    return {
        size,
        board: Array.from({length: size}, function () {
            return Array.from({length: size}, function () {
                return null;
            });
        }),
        currentPlayer: PLAYER_ONE,
        winner: null,
        status: STATUS_PLAYING,
        moveCount: 0
    };
};

/**
 * Places the current player's marker on the board and returns a new game
 * state. After placement, the function checks for a win or a draw and
 * updates `status` and `winner` accordingly.
 *
 * **Invalid moves:** if the target cell is occupied, the coordinates are
 * out of bounds, the coordinates are not integers, or the game is already
 * over, the **original state is returned unchanged** (no exception is
 * thrown). Use {@link isValidMove} beforehand if you need to distinguish
 * an invalid move from a successful one.
 *
 * The original `state` object and all of its nested arrays are never
 * modified.
 *
 * @param {GameState} state  - The current game state.
 * @param {number}    row    - Zero-based row index of the target cell.
 * @param {number}    column - Zero-based column index of the target cell.
 * @returns {GameState}
 *   A new game state reflecting the move, or the original state if the
 *   move was invalid.
 */
const makeMove = function (state, row, column) {
    if (!isValidMove(state, row, column)) {
        return state;
    }

    // Build a new board. Only the affected row is rebuilt; all other rows are
    // shallow-copied so that the original arrays remain untouched.
    const placedPlayer = state.currentPlayer;
    const newBoard = state.board.map(function (boardRow, i) {
        if (i !== row) {
            return boardRow.slice();
        }
        return boardRow.map(function (cell, j) {
            return j === column ? placedPlayer : cell;
        });
    });

    const newMoveCount = state.moveCount + 1;

    // Build a temporary state so we can run win/draw detection against
    // the updated board without mutating anything.
    const provisional = {
        size: state.size,
        board: newBoard,
        currentPlayer: placedPlayer,
        winner: null,
        status: STATUS_PLAYING,
        moveCount: newMoveCount
    };

    if (hasWinningPath(provisional, placedPlayer)) {
        return {
            size: state.size,
            board: newBoard,
            currentPlayer: placedPlayer,
            winner: placedPlayer,
            status: STATUS_WON,
            moveCount: newMoveCount
        };
    }

    // Draw: every cell is filled and no winner.
    const boardFull = newMoveCount === state.size * state.size;
    if (boardFull) {
        return {
            size: state.size,
            board: newBoard,
            currentPlayer: opponentOf(placedPlayer),
            winner: null,
            status: STATUS_DRAW,
            moveCount: newMoveCount
        };
    }

    return {
        size: state.size,
        board: newBoard,
        currentPlayer: opponentOf(placedPlayer),
        winner: null,
        status: STATUS_PLAYING,
        moveCount: newMoveCount
    };
};

/**
 * Returns a new initial game state with the same board size as `state`.
 * All game progress is discarded.
 *
 * @param {GameState} state - The game state whose size should be preserved.
 * @returns {GameState} A fresh game state.
 */
const restartGame = function (state) {
    return createGame(state.size);
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
    PLAYER_ONE,
    PLAYER_TWO,
    createGame,
    getBoard,
    getCurrentPlayer,
    getCell,
    getLegalMoves,
    isValidMove,
    makeMove,
    hasWinningPath,
    getWinner,
    isDraw,
    isGameOver,
    getGameStatus,
    restartGame
};
