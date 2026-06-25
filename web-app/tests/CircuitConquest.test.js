/**
 * Behavioural tests for the CircuitConquest game module.
 *
 * These tests describe observable behaviour – what the public API produces –
 * not how the implementation works internally. Every test can fail for a
 * realistic incorrect implementation.
 *
 * Milestone 1 covers: initial state, legal-move validation, state
 * transitions (move placement, turn alternation, immutability), basic
 * status queries, and restart.
 *
 * Win-condition and draw-detection tests are added in Milestone 2.
 */

import assert from "assert";
import {
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
} from "../CircuitConquest.js";

// ─── Initial State ────────────────────────────────────────────────────────────

describe("createGame – initial state", function () {

    it("returns a board with the default side length of 7", function () {
        const state = createGame();
        assert.strictEqual(state.size, 7);
    });

    it("returns a board that has 7 rows", function () {
        const state = createGame();
        assert.strictEqual(state.board.length, 7);
    });

    it("returns a board where every row has 7 columns", function () {
        const state = createGame();
        state.board.forEach(function (row) {
            assert.strictEqual(row.length, 7);
        });
    });

    it("returns a board where every cell is null (empty)", function () {
        const state = createGame();
        state.board.forEach(function (row) {
            row.forEach(function (cell) {
                assert.strictEqual(cell, null, "Every cell should be null on a new board");
            });
        });
    });

    it("sets Player One as the first player to move", function () {
        const state = createGame();
        assert.strictEqual(state.currentPlayer, PLAYER_ONE);
    });

    it("has no winner at the start", function () {
        const state = createGame();
        assert.strictEqual(state.winner, null);
    });

    it("has a status of 'playing' at the start", function () {
        const state = createGame();
        assert.strictEqual(state.status, "playing");
    });

    it("starts with a move count of zero", function () {
        const state = createGame();
        assert.strictEqual(state.moveCount, 0);
    });

    it("creates a board of the requested custom size", function () {
        const state = createGame(5);
        assert.strictEqual(state.size, 5);
        assert.strictEqual(state.board.length, 5);
        state.board.forEach(function (row) {
            assert.strictEqual(row.length, 5);
        });
    });

});

// ─── Legal Moves – isValidMove ────────────────────────────────────────────────

describe("isValidMove – legal-move validation", function () {

    it("returns true for an empty in-range cell on a new board", function () {
        const state = createGame();
        assert.strictEqual(isValidMove(state, 0, 0), true);
    });

    it("returns true for a cell in the interior of the board", function () {
        const state = createGame();
        assert.strictEqual(isValidMove(state, 3, 3), true);
    });

    it("returns false for a cell that has already been occupied", function () {
        // Place a marker at (3, 3) then try again at the same cell.
        const state = makeMove(createGame(), 3, 3);
        assert.strictEqual(isValidMove(state, 3, 3), false);
    });

    it("returns false for a negative row coordinate", function () {
        const state = createGame();
        assert.strictEqual(isValidMove(state, -1, 0), false);
    });

    it("returns false for a negative column coordinate", function () {
        const state = createGame();
        assert.strictEqual(isValidMove(state, 0, -1), false);
    });

    it("returns false for a row that equals the board size (one past the end)", function () {
        const state = createGame();
        assert.strictEqual(isValidMove(state, 7, 0), false);
    });

    it("returns false for a column that equals the board size (one past the end)", function () {
        const state = createGame();
        assert.strictEqual(isValidMove(state, 0, 7), false);
    });

    it("returns false safely for a fractional row (not an integer)", function () {
        const state = createGame();
        assert.strictEqual(isValidMove(state, 1.5, 0), false);
    });

    it("returns false safely for a fractional column (not an integer)", function () {
        const state = createGame();
        assert.strictEqual(isValidMove(state, 0, 2.9), false);
    });

});

// ─── Legal Moves – getLegalMoves ─────────────────────────────────────────────

describe("getLegalMoves – enumeration of legal moves", function () {

    it("returns 49 legal moves on a fresh 7 × 7 board", function () {
        const state = createGame();
        assert.strictEqual(getLegalMoves(state).length, 49);
    });

    it("returns 48 legal moves after the first move", function () {
        const state = makeMove(createGame(), 0, 0);
        assert.strictEqual(getLegalMoves(state).length, 48);
    });

    it("returns all four cells on a fresh 2 × 2 board in row-major order", function () {
        const state = createGame(2);
        const moves = getLegalMoves(state);
        assert.deepStrictEqual(moves, [
            {row: 0, column: 0},
            {row: 0, column: 1},
            {row: 1, column: 0},
            {row: 1, column: 1}
        ]);
    });

    it("does not list the occupied cell after a move", function () {
        const state = makeMove(createGame(2), 0, 0);
        const moves = getLegalMoves(state);
        const occupiedListed = moves.some(function (m) {
            return m.row === 0 && m.column === 0;
        });
        assert.strictEqual(occupiedListed, false);
    });

});

// ─── State Transitions – makeMove ────────────────────────────────────────────

describe("makeMove – state transitions", function () {

    it("places Player One's marker at the chosen cell", function () {
        const state = makeMove(createGame(), 2, 4);
        assert.strictEqual(getCell(state, 2, 4), PLAYER_ONE);
    });

    it("places Player Two's marker after Player One has moved", function () {
        let state = createGame();
        state = makeMove(state, 0, 0); // Player One
        state = makeMove(state, 1, 1); // Player Two
        assert.strictEqual(getCell(state, 1, 1), PLAYER_TWO);
    });

    it("switches to Player Two after Player One moves", function () {
        const state = makeMove(createGame(), 0, 0);
        assert.strictEqual(getCurrentPlayer(state), PLAYER_TWO);
    });

    it("switches back to Player One after Player Two moves", function () {
        let state = createGame();
        state = makeMove(state, 0, 0); // Player One
        state = makeMove(state, 1, 0); // Player Two
        assert.strictEqual(getCurrentPlayer(state), PLAYER_ONE);
    });

    it("increments the move count by exactly one per move", function () {
        const before = createGame();
        const after = makeMove(before, 3, 3);
        assert.strictEqual(after.moveCount, before.moveCount + 1);
    });

    it("does not change any cell other than the one targeted", function () {
        const state = makeMove(createGame(), 0, 0);
        assert.strictEqual(getCell(state, 0, 1), null, "(0,1) should still be empty");
        assert.strictEqual(getCell(state, 1, 0), null, "(1,0) should still be empty");
        assert.strictEqual(getCell(state, 3, 3), null, "(3,3) should still be empty");
    });

    it("does not mutate the original state object", function () {
        const original = createGame();
        makeMove(original, 3, 3);
        assert.strictEqual(original.moveCount, 0, "moveCount should be unchanged");
        assert.strictEqual(original.currentPlayer, PLAYER_ONE, "currentPlayer should be unchanged");
        assert.strictEqual(original.status, "playing", "status should be unchanged");
    });

    it("does not mutate any row in the original board", function () {
        const original = createGame();
        // Take a snapshot of every cell value before the call.
        const snapshot = original.board.map(function (row) {
            return row.slice();
        });
        makeMove(original, 3, 3);
        original.board.forEach(function (row, r) {
            row.forEach(function (cell, c) {
                assert.strictEqual(
                    cell,
                    snapshot[r][c],
                    `Cell (${r},${c}) in the original board should be unchanged`
                );
            });
        });
    });

    it("returns the original state object when the target cell is already occupied", function () {
        const state = makeMove(createGame(), 0, 0);
        const result = makeMove(state, 0, 0); // same cell again
        assert.strictEqual(result, state, "Invalid move should return the same state reference");
    });

    it("returns the original state object for an out-of-bounds move", function () {
        const state = createGame();
        const result = makeMove(state, 99, 99);
        assert.strictEqual(result, state);
    });

    it("returns the original state object for a negative-coordinate move", function () {
        const state = createGame();
        const result = makeMove(state, -1, 0);
        assert.strictEqual(result, state);
    });

    it("returns a new state object reference (not the same object) after a valid move", function () {
        const before = createGame();
        const after = makeMove(before, 0, 0);
        assert.notStrictEqual(after, before, "makeMove should return a new state object, not the original");
    });

    it("returns a new outer board array reference after a valid move", function () {
        const before = createGame();
        const after = makeMove(before, 0, 0);
        assert.notStrictEqual(after.board, before.board, "after.board should be a different array from before.board");
    });

    it("returns a new array for every row, not shared references from the original board", function () {
        const before = createGame();
        const after = makeMove(before, 0, 0);
        before.board.forEach(function (originalRow, r) {
            assert.notStrictEqual(
                after.board[r],
                originalRow,
                `Row ${r} in the new board should be a new array, not the same reference as the original`
            );
        });
    });

});

// ─── Cell and Board Queries ───────────────────────────────────────────────────

describe("getCell – cell inspection", function () {

    it("returns null for an empty cell on a fresh board", function () {
        const state = createGame();
        assert.strictEqual(getCell(state, 0, 0), null);
    });

    it("returns the player identifier after that cell is occupied", function () {
        const state = makeMove(createGame(), 2, 5);
        assert.strictEqual(getCell(state, 2, 5), PLAYER_ONE);
    });

    it("returns undefined for a row coordinate that is out of bounds", function () {
        const state = createGame();
        assert.strictEqual(getCell(state, 7, 0), undefined);
    });

    it("returns undefined for a column coordinate that is out of bounds", function () {
        const state = createGame();
        assert.strictEqual(getCell(state, 0, 7), undefined);
    });

    it("returns undefined for a non-integer row coordinate", function () {
        const state = createGame();
        assert.strictEqual(getCell(state, 0.5, 0), undefined);
    });

});

describe("getBoard – defensive copy", function () {

    it("returns an array with the same cell values as the board", function () {
        const state = makeMove(createGame(), 0, 0);
        const board = getBoard(state);
        assert.strictEqual(board[0][0], PLAYER_ONE);
    });

    it("returns an array that does not share row references with the state", function () {
        const state = createGame();
        const board = getBoard(state);
        board[0][0] = PLAYER_ONE; // mutate the copy
        assert.strictEqual(
            state.board[0][0],
            null,
            "Mutating the getBoard() result must not change the state"
        );
    });

});

// ─── Status Queries ───────────────────────────────────────────────────────────

describe("isGameOver / getWinner / isDraw – status queries", function () {

    it("isGameOver returns false on a new game", function () {
        assert.strictEqual(isGameOver(createGame()), false);
    });

    it("getWinner returns null at the start", function () {
        assert.strictEqual(getWinner(createGame()), null);
    });

    it("isDraw returns false at the start", function () {
        assert.strictEqual(isDraw(createGame()), false);
    });

});

describe("getGameStatus – human-readable status", function () {

    it("returns a non-empty string during a game in progress", function () {
        const status = getGameStatus(createGame());
        assert.ok(typeof status === "string" && status.length > 0);
    });

    it("includes 'playerOne' in the status when it is Player One's turn", function () {
        const status = getGameStatus(createGame());
        assert.ok(
            status.includes(PLAYER_ONE),
            `Expected status to mention playerOne, got: "${status}"`
        );
    });

    it("includes 'playerTwo' in the status after Player One moves", function () {
        const status = getGameStatus(makeMove(createGame(), 0, 0));
        assert.ok(
            status.includes(PLAYER_TWO),
            `Expected status to mention playerTwo, got: "${status}"`
        );
    });

});

// ─── Win Conditions ───────────────────────────────────────────────────────────

describe("hasWinningPath – win detection", function () {

    it("returns false for a newly created board (no moves made)", function () {
        const state = createGame();
        assert.strictEqual(hasWinningPath(state, PLAYER_ONE), false);
        assert.strictEqual(hasWinningPath(state, PLAYER_TWO), false);
    });

    it("Player One wins with a straight vertical path filling column 0", function () {
        // Place playerOne in every cell of column 0, rows 0-6.
        // This connects top edge to bottom edge via a single column.
        let state = createGame();
        let r = 0;
        while (r < 7) {
            // Player One's turns: r = 0,2,4,6 after 4 P1 turns and 3 P2 turns.
            // Easier: build state by hand using makeMove in alternation.
            // P1 fills col 0; P2 fills col 6 (out of the way).
            state = makeMove(state, r, 0); // Player One → col 0
            if (r < 6) {
                state = makeMove(state, r, 6); // Player Two → col 6 (dummy)
            }
            r += 1;
        }
        assert.strictEqual(state.status, "won");
        assert.strictEqual(state.winner, PLAYER_ONE);
    });

    it("Player Two wins with a straight horizontal path filling row 0", function () {
        // P1 fills row 6 (bottom, out of the way); P2 fills row 0 (left→right).
        let state = createGame();
        let c = 0;
        while (c < 7) {
            state = makeMove(state, 6, c); // Player One → row 6
            if (c < 6) {
                state = makeMove(state, 0, c); // Player Two → row 0
            }
            c += 1;
        }
        // At this point P1 has filled row 6 (7 cells), P2 has filled row 0 cols 0-5 (6 cells).
        // P2 still needs col 6 of row 0.
        state = makeMove(state, 0, 6); // Player Two completes row 0
        assert.strictEqual(state.status, "won");
        assert.strictEqual(state.winner, PLAYER_TWO);
    });

    it("a broken path for Player One is not a win", function () {
        // Place P1 in rows 0,1,3,4,5,6 of column 0 – row 2 is missing.
        let state = createGame();
        const p1Cells = [[0,0],[1,0],[3,0],[4,0],[5,0],[6,0]];
        // Place them with P2 filling neutral cells in between turns.
        let p2Col = 6;
        p1Cells.forEach(function ([row, col]) {
            state = makeMove(state, row, col);   // P1
            if (!isGameOver(state)) {
                state = makeMove(state, row, p2Col); // P2 dummy (same row, col 6)
            }
        });
        assert.strictEqual(hasWinningPath(state, PLAYER_ONE), false);
    });

    it("a diagonal-only chain for Player One is not a win", function () {
        // P1 occupies (0,0),(1,1),(2,2),(3,3),(4,4),(5,5),(6,6) – purely diagonal.
        // These cells are not orthogonally connected, so no path exists.
        let state = createGame();
        let i = 0;
        while (i < 7) {
            state = makeMove(state, i, i);     // P1 diagonal
            if (i < 6 && !isGameOver(state)) {
                state = makeMove(state, i, 6); // P2 dummy (col 6, same row)
            }
            i += 1;
        }
        assert.strictEqual(hasWinningPath(state, PLAYER_ONE), false);
    });

    it("an indirect orthogonal path for Player One is recognised as a win", function () {
        // P1 creates an L-shaped path: col 0 rows 0-3, then row 3 cols 0-6,
        // but actually let's do: col 0 rows 0-3, then row 3 cols 1-3, then col 3 rows 3-6.
        // This connects top (row 0) to bottom (row 6) via an orthogonal detour.
        // We'll drive this purely through makeMove to keep the test honest.
        let state = createGame(5); // use 5×5 to keep it short

        // Target path for P1 (must touch row 0 and row 4):
        // (0,0)→(1,0)→(2,0)→(2,1)→(2,2)→(3,2)→(4,2)
        const p1Path = [[0,0],[1,0],[2,0],[2,1],[2,2],[3,2],[4,2]];
        // P2 fills harmless cells.
        const p2Cells = [[0,4],[1,4],[2,4],[3,4],[4,4],[4,3],[4,1]];

        p1Path.forEach(function (p1, idx) {
            state = makeMove(state, p1[0], p1[1]);
            if (!isGameOver(state) && idx < p2Cells.length) {
                state = makeMove(state, p2Cells[idx][0], p2Cells[idx][1]);
            }
        });

        assert.strictEqual(state.status, "won");
        assert.strictEqual(state.winner, PLAYER_ONE);
    });

    it("the game stops accepting moves after Player One wins", function () {
        let state = createGame();
        // Fill col 0 for P1, col 6 dummy for P2.
        let r = 0;
        while (r < 7) {
            state = makeMove(state, r, 0);
            if (r < 6) { state = makeMove(state, r, 6); }
            r += 1;
        }
        assert.strictEqual(isGameOver(state), true);
        // Attempting another move returns the state unchanged.
        const after = makeMove(state, 0, 1);
        assert.strictEqual(after, state);
    });

});

// ─── Draw Condition ───────────────────────────────────────────────────────────

describe("draw condition", function () {

    it("a completely filled 2 × 2 board with no winning path is a draw", function () {
        // On a 2×2 board it is impossible for either player to connect opposite
        // edges (each edge is only 1 cell wide and the opponents' cells will
        // block). We arrange: P1 gets (0,1) and (1,0); P2 gets (0,0) and (1,1).
        // Neither can connect top-bottom (P1) or left-right (P2).
        let state = createGame(2);
        state = makeMove(state, 0, 1); // P1 → top-right
        state = makeMove(state, 0, 0); // P2 → top-left
        state = makeMove(state, 1, 0); // P1 → bottom-left
        state = makeMove(state, 1, 1); // P2 → bottom-right
        assert.strictEqual(state.status, "draw");
    });

    it("no legal moves remain after a draw", function () {
        let state = createGame(2);
        state = makeMove(state, 0, 1);
        state = makeMove(state, 0, 0);
        state = makeMove(state, 1, 0);
        state = makeMove(state, 1, 1);
        assert.strictEqual(getLegalMoves(state).length, 0);
    });

    it("isValidMove returns false after a draw", function () {
        let state = createGame(2);
        state = makeMove(state, 0, 1);
        state = makeMove(state, 0, 0);
        state = makeMove(state, 1, 0);
        state = makeMove(state, 1, 1);
        assert.strictEqual(isValidMove(state, 0, 0), false);
    });

});

// ─── Restart ─────────────────────────────────────────────────────────────────

describe("restartGame – restart behaviour", function () {

    it("returns a board where all cells are empty", function () {
        let state = makeMove(createGame(), 0, 0);
        state = restartGame(state);
        state.board.forEach(function (row) {
            row.forEach(function (cell) {
                assert.strictEqual(cell, null);
            });
        });
    });

    it("resets the current player to Player One", function () {
        let state = makeMove(createGame(), 0, 0); // now Player Two's turn
        state = restartGame(state);
        assert.strictEqual(state.currentPlayer, PLAYER_ONE);
    });

    it("resets the status to 'playing'", function () {
        const state = restartGame(createGame());
        assert.strictEqual(state.status, "playing");
    });

    it("resets the move count to zero", function () {
        let state = makeMove(createGame(), 0, 0);
        state = restartGame(state);
        assert.strictEqual(state.moveCount, 0);
    });

    it("resets the winner to null", function () {
        const state = restartGame(createGame());
        assert.strictEqual(state.winner, null);
    });

    it("preserves the original board size", function () {
        const state = restartGame(createGame(5));
        assert.strictEqual(state.size, 5);
        assert.strictEqual(state.board.length, 5);
    });

    it("restarting repeatedly always produces a fresh board", function () {
        let state = createGame();
        state = makeMove(state, 0, 0);
        state = restartGame(state);
        state = makeMove(state, 3, 3);
        state = restartGame(state);
        state.board.forEach(function (row) {
            row.forEach(function (cell) {
                assert.strictEqual(cell, null);
            });
        });
    });

});
