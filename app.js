// Chess Master - Complete Chess Application with Perfect Castling
class ChessGame {
    constructor() {
        // Game state
        this.board = [];
        this.currentPlayer = 'white';
        this.gameMode = null;
        this.isGameOver = false;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.kingPositions = { white: { row: 7, col: 4 }, black: { row: 0, col: 4 } };
        
        // Castling rights tracking
        this.castlingRights = { 
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        
        // Move tracking for castling validation
        this.hasKingMoved = { white: false, black: false };
        this.hasRookMoved = {
            white: { kingside: false, queenside: false },
            black: { kingside: false, queenside: false }
        };
        
        this.enPassantTarget = null;
        this.halfmoveClock = 0;
        this.fullmoveNumber = 1;
        
        // Last move tracking (for highlighting)
        this.lastMove = null;
        
        // Board history for undo
        this.boardHistory = [];
        
        // Game settings
        this.settings = {
            boardTheme: 'green',
            pieceStyle: 'classic',
            soundEffects: 'on',
            showLegalMoves: 'on'
        };
        
        // Selected square and legal moves
        this.selectedSquare = null;
        this.legalMoves = [];
        this.promotionMove = null;
        
        // Piece symbol sets for each style
        this.pieceSymbolSets = {
            // Classic – standard Unicode outline/filled glyphs
            'classic': {
                'white': { 'king': '♔', 'queen': '♕', 'rook': '♖', 'bishop': '♗', 'knight': '♘', 'pawn': '♙' },
                'black': { 'king': '♚', 'queen': '♛', 'rook': '♜', 'bishop': '♝', 'knight': '♞', 'pawn': '♟' }
            },
            // Modern – outline glyphs for white, filled for black; CSS provides the 3D shading
            'modern': {
                'white': { 'king': '♔', 'queen': '♕', 'rook': '♖', 'bishop': '♗', 'knight': '♘', 'pawn': '♙' },
                'black': { 'king': '♚', 'queen': '♛', 'rook': '♜', 'bishop': '♝', 'knight': '♞', 'pawn': '♟' }
            },
            // Letter – K/Q/R/B/N/P text inside CSS circle badges
            'letter': {
                'white': { 'king': 'K', 'queen': 'Q', 'rook': 'R', 'bishop': 'B', 'knight': 'N', 'pawn': 'P' },
                'black': { 'king': 'K', 'queen': 'Q', 'rook': 'R', 'bishop': 'B', 'knight': 'N', 'pawn': 'P' }
            }
        };
        
        // Active piece symbol set (updated when settings change)
        this.pieceSymbols = this.pieceSymbolSets['classic'];
        
        this.initializeBoard();
    }
    
    // Initialize empty board
    initializeBoard() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
    }
    
    // Set up starting position
    setupStartingPosition() {
        this.initializeBoard();
        
        // Place pawns
        for (let col = 0; col < 8; col++) {
            this.board[1][col] = { type: 'pawn', color: 'black' };
            this.board[6][col] = { type: 'pawn', color: 'white' };
        }
        
        // Place other pieces
        const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        for (let col = 0; col < 8; col++) {
            this.board[0][col] = { type: backRank[col], color: 'black' };
            this.board[7][col] = { type: backRank[col], color: 'white' };
        }
        
        // Reset game state
        this.currentPlayer = 'white';
        this.isGameOver = false;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.kingPositions = { white: { row: 7, col: 4 }, black: { row: 0, col: 4 } };
        this.castlingRights = { 
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        this.hasKingMoved = { white: false, black: false };
        this.hasRookMoved = {
            white: { kingside: false, queenside: false },
            black: { kingside: false, queenside: false }
        };
        this.enPassantTarget = null;
        this.halfmoveClock = 0;
        this.fullmoveNumber = 1;
        this.selectedSquare = null;
        this.legalMoves = [];
        this.promotionMove = null;
        this.lastMove = null;
        this.boardHistory = [];
    }
    
    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }
    
    // Check if a square is under attack by the specified color
    isSquareUnderAttack(row, col, byColor) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === byColor) {
                    // For castling checks, we need to exclude castling moves from attack calculations
                    const moves = this.generatePieceMoves(r, c, false, true);
                    if (moves.some(move => move.row === row && move.col === col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    // Check if the king is in check
    isInCheck(color) {
        const kingPos = this.kingPositions[color];
        if (!kingPos) return false;
        const opponentColor = color === 'white' ? 'black' : 'white';
        return this.isSquareUnderAttack(kingPos.row, kingPos.col, opponentColor);
    }
    
    // Complete castling validation
    canCastle(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        if (!piece || piece.type !== 'king') return false;
        
        const direction = toCol > fromCol ? 1 : -1; // 1 for kingside, -1 for queenside
        const isKingside = direction === 1;
        const rookCol = isKingside ? 7 : 0;
        const rook = this.board[fromRow][rookCol];
        
        // Check if king has moved
        if (this.hasKingMoved[piece.color]) return false;
        
        // Check if rook exists and hasn't moved
        if (!rook || rook.type !== 'rook' || rook.color !== piece.color) return false;
        if (this.hasRookMoved[piece.color][isKingside ? 'kingside' : 'queenside']) return false;
        
        // Check if castling rights are still available
        if (!this.castlingRights[piece.color][isKingside ? 'kingside' : 'queenside']) return false;
        
        // Check if king is in check
        if (this.isInCheck(piece.color)) return false;
        
        // Check if path is clear between king and rook
        const start = Math.min(fromCol, rookCol) + 1;
        const end = Math.max(fromCol, rookCol);
        for (let col = start; col < end; col++) {
            if (this.board[fromRow][col] !== null) return false;
        }
        
        // Check if king passes through check or ends in check
        const opponentColor = piece.color === 'white' ? 'black' : 'white';
        
        // Check square king passes through
        const passThroughCol = fromCol + direction;
        if (this.isSquareUnderAttack(fromRow, passThroughCol, opponentColor)) return false;
        
        // Check square king ends on
        if (this.isSquareUnderAttack(fromRow, toCol, opponentColor)) return false;
        
        return true;
    }
    
    // Generate all possible moves for a piece at the given position
    generatePieceMoves(row, col, checkForCheck = true, excludeCastling = false) {
        const piece = this.board[row][col];
        if (!piece) return [];
        
        let moves = [];
        
        switch (piece.type) {
            case 'pawn':
                moves = this.generatePawnMoves(row, col);
                break;
            case 'rook':
                moves = this.generateRookMoves(row, col);
                break;
            case 'knight':
                moves = this.generateKnightMoves(row, col);
                break;
            case 'bishop':
                moves = this.generateBishopMoves(row, col);
                break;
            case 'queen':
                moves = this.generateQueenMoves(row, col);
                break;
            case 'king':
                moves = this.generateKingMoves(row, col, excludeCastling);
                break;
        }
        
        // Filter out moves that would put own king in check
        if (checkForCheck) {
            moves = moves.filter(move => !this.wouldBeInCheckAfterMove(row, col, move.row, move.col));
        }
        
        return moves;
    }
    
    generatePawnMoves(row, col) {
        const piece = this.board[row][col];
        const moves = [];
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;
        
        // Forward moves
        const oneSquareForward = row + direction;
        if (this.isValidPosition(oneSquareForward, col) && !this.board[oneSquareForward][col]) {
            // Check for promotion
            if (oneSquareForward === 0 || oneSquareForward === 7) {
                moves.push({ row: oneSquareForward, col, type: 'promotion' });
            } else {
                moves.push({ row: oneSquareForward, col, type: 'move' });
            }
            
            // Two squares forward from starting position
            const twoSquareForward = row + 2 * direction;
            if (row === startRow && this.isValidPosition(twoSquareForward, col) && !this.board[twoSquareForward][col]) {
                moves.push({ row: twoSquareForward, col, type: 'move' });
            }
        }
        
        // Captures
        for (let dcol of [-1, 1]) {
            const newRow = row + direction;
            const newCol = col + dcol;
            
            if (this.isValidPosition(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (target && target.color !== piece.color) {
                    // Check for promotion
                    if (newRow === 0 || newRow === 7) {
                        moves.push({ row: newRow, col: newCol, type: 'promotion-capture' });
                    } else {
                        moves.push({ row: newRow, col: newCol, type: 'capture' });
                    }
                }
                
                // En passant
                if (this.enPassantTarget && 
                    this.enPassantTarget.row === newRow && 
                    this.enPassantTarget.col === newCol) {
                    moves.push({ row: newRow, col: newCol, type: 'enpassant' });
                }
            }
        }
        
        return moves;
    }
    
    generateRookMoves(row, col) {
        const piece = this.board[row][col];
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        
        for (let [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + dr * i;
                const newCol = col + dc * i;
                
                if (!this.isValidPosition(newRow, newCol)) break;
                
                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push({ row: newRow, col: newCol, type: 'move' });
                } else {
                    if (target.color !== piece.color) {
                        moves.push({ row: newRow, col: newCol, type: 'capture' });
                    }
                    break;
                }
            }
        }
        
        return moves;
    }
    
    generateKnightMoves(row, col) {
        const piece = this.board[row][col];
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        for (let [dr, dc] of knightMoves) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isValidPosition(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push({ row: newRow, col: newCol, type: 'move' });
                } else if (target.color !== piece.color) {
                    moves.push({ row: newRow, col: newCol, type: 'capture' });
                }
            }
        }
        
        return moves;
    }
    
    generateBishopMoves(row, col) {
        const piece = this.board[row][col];
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        for (let [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + dr * i;
                const newCol = col + dc * i;
                
                if (!this.isValidPosition(newRow, newCol)) break;
                
                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push({ row: newRow, col: newCol, type: 'move' });
                } else {
                    if (target.color !== piece.color) {
                        moves.push({ row: newRow, col: newCol, type: 'capture' });
                    }
                    break;
                }
            }
        }
        
        return moves;
    }
    
    generateQueenMoves(row, col) {
        return [...this.generateRookMoves(row, col), ...this.generateBishopMoves(row, col)];
    }
    
    generateKingMoves(row, col, excludeCastling = false) {
        const piece = this.board[row][col];
        const moves = [];
        const kingMoves = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        // Normal king moves
        for (let [dr, dc] of kingMoves) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isValidPosition(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push({ row: newRow, col: newCol, type: 'move' });
                } else if (target.color !== piece.color) {
                    moves.push({ row: newRow, col: newCol, type: 'capture' });
                }
            }
        }
        
        // Castling moves - only add if not excluding castling
        if (!excludeCastling && !this.hasKingMoved[piece.color]) {
            // Kingside castling
            if (this.canCastle(row, col, row, col + 2)) {
                moves.push({ row, col: col + 2, type: 'castle-kingside' });
            }
            
            // Queenside castling
            if (this.canCastle(row, col, row, col - 2)) {
                moves.push({ row, col: col - 2, type: 'castle-queenside' });
            }
        }
        
        return moves;
    }
    
    wouldBeInCheckAfterMove(fromRow, fromCol, toRow, toCol) {
        // Make temporary move
        const piece = this.board[fromRow][fromCol];
        const captured = this.board[toRow][toCol];
        const oldKingPos = { ...this.kingPositions[piece.color] };
        
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Handle en passant - the captured pawn is not on the destination square
        let epCaptureRow = -1;
        let epCapturedPiece = null;
        if (piece.type === 'pawn' && this.enPassantTarget &&
            this.enPassantTarget.row === toRow && this.enPassantTarget.col === toCol) {
            epCaptureRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
            epCapturedPiece = this.board[epCaptureRow][toCol];
            this.board[epCaptureRow][toCol] = null;
        }
        
        if (piece.type === 'king') {
            this.kingPositions[piece.color] = { row: toRow, col: toCol };
        }
        
        const inCheck = this.isInCheck(piece.color);
        
        // Undo move
        this.board[fromRow][fromCol] = piece;
        this.board[toRow][toCol] = captured;
        if (epCaptureRow >= 0) {
            this.board[epCaptureRow][toCol] = epCapturedPiece;
        }
        this.kingPositions[piece.color] = oldKingPos;
        
        return inCheck;
    }
    
    // Make a move on the board
    makeMove(fromRow, fromCol, toRow, toCol, promotionPiece = 'queen') {
        const piece = this.board[fromRow][fromCol];
        if (!piece || piece.color !== this.currentPlayer) {
            return false;
        }
        
        const legalMoves = this.generatePieceMoves(fromRow, fromCol);
        const move = legalMoves.find(m => m.row === toRow && m.col === toCol);
        
        if (!move) {
            return false;
        }
        
        // Handle pawn promotion
        if (move.type === 'promotion' || move.type === 'promotion-capture') {
            if (!promotionPiece || !['queen', 'rook', 'bishop', 'knight'].includes(promotionPiece)) {
                // Store promotion move for later resolution
                this.promotionMove = { fromRow, fromCol, toRow, toCol, move };
                return 'promotion';
            }
        }
        
        return this.executeMoveInternal(fromRow, fromCol, toRow, toCol, move, promotionPiece);
    }
    
    executeMoveInternal(fromRow, fromCol, toRow, toCol, move, promotionPiece = 'queen') {
        const piece = this.board[fromRow][fromCol];
        
        // Save board snapshot for undo before making the move (keep max 100 snapshots)
        if (this.boardHistory.length >= 100) this.boardHistory.shift();
        this.boardHistory.push(this.getBoardSnapshot());
        
        // Store move information for history
        const moveInfo = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: { ...piece },
            captured: this.board[toRow][toCol] ? { ...this.board[toRow][toCol] } : null,
            type: move.type,
            notation: '',
            check: false,
            checkmate: false
        };
        
        // Handle special moves
        switch (move.type) {
            case 'castle-kingside':
                // Move rook
                this.board[fromRow][5] = this.board[fromRow][7];
                this.board[fromRow][7] = null;
                // Update castling rights
                this.castlingRights[piece.color].kingside = false;
                this.castlingRights[piece.color].queenside = false;
                this.hasKingMoved[piece.color] = true;
                break;
                
            case 'castle-queenside':
                // Move rook
                this.board[fromRow][3] = this.board[fromRow][0];
                this.board[fromRow][0] = null;
                // Update castling rights
                this.castlingRights[piece.color].kingside = false;
                this.castlingRights[piece.color].queenside = false;
                this.hasKingMoved[piece.color] = true;
                break;
                
            case 'enpassant':
                const captureRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
                moveInfo.captured = this.board[captureRow][toCol];
                this.board[captureRow][toCol] = null;
                this.capturedPieces[piece.color].push(moveInfo.captured);
                break;
                
            case 'capture':
            case 'promotion-capture':
                this.capturedPieces[piece.color].push(this.board[toRow][toCol]);
                break;
        }
        
        // Make the move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Handle pawn promotion
        if (move.type === 'promotion' || move.type === 'promotion-capture') {
            this.board[toRow][toCol] = { type: promotionPiece, color: piece.color };
            moveInfo.promotion = promotionPiece;
        }
        
        // Update king position
        if (piece.type === 'king') {
            this.kingPositions[piece.color] = { row: toRow, col: toCol };
            this.hasKingMoved[piece.color] = true;
            this.castlingRights[piece.color].kingside = false;
            this.castlingRights[piece.color].queenside = false;
        }
        
        // Update rook movement tracking for castling
        if (piece.type === 'rook') {
            if (fromRow === 0) { // Black rooks
                if (fromCol === 0) this.hasRookMoved.black.queenside = true;
                if (fromCol === 7) this.hasRookMoved.black.kingside = true;
            }
            if (fromRow === 7) { // White rooks
                if (fromCol === 0) this.hasRookMoved.white.queenside = true;
                if (fromCol === 7) this.hasRookMoved.white.kingside = true;
            }
        }
        
        // Update castling rights if rook is captured
        if (moveInfo.captured && moveInfo.captured.type === 'rook') {
            if (toRow === 0) { // Black rook captured
                if (toCol === 0) this.castlingRights.black.queenside = false;
                if (toCol === 7) this.castlingRights.black.kingside = false;
            }
            if (toRow === 7) { // White rook captured
                if (toCol === 0) this.castlingRights.white.queenside = false;
                if (toCol === 7) this.castlingRights.white.kingside = false;
            }
        }
        
        // Set en passant target
        this.enPassantTarget = null;
        if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
            this.enPassantTarget = { row: (fromRow + toRow) / 2, col: toCol };
        }
        
        // Update move counters
        if (piece.type === 'pawn' || move.type === 'capture' || move.type === 'enpassant' || move.type === 'promotion-capture') {
            this.halfmoveClock = 0;
        } else {
            this.halfmoveClock++;
        }
        
        if (this.currentPlayer === 'black') {
            this.fullmoveNumber++;
        }
        
        // Switch turns first
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // Check for check/checkmate after switching turns
        moveInfo.check = this.isInCheck(this.currentPlayer);
        moveInfo.checkmate = moveInfo.check && this.isCheckmate(this.currentPlayer);
        
        // Generate algebraic notation
        moveInfo.notation = this.generateAlgebraicNotation(moveInfo);
        
        // Add to move history
        this.moveHistory.push(moveInfo);
        
        // Update game status
        if (moveInfo.checkmate) {
            this.isGameOver = true;
        } else if (this.isStalemate() || this.isDraw()) {
            this.isGameOver = true;
        }
        
        // Track last move for highlighting
        this.lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
        
        return true;
    }
    
    generateAlgebraicNotation(moveInfo) {
        const { from, to, piece, captured, type, check, checkmate, promotion } = moveInfo;
        
        if (type === 'castle-kingside') return checkmate ? 'O-O#' : check ? 'O-O+' : 'O-O';
        if (type === 'castle-queenside') return checkmate ? 'O-O-O#' : check ? 'O-O-O+' : 'O-O-O';
        
        let notation = '';
        
        // Piece symbol (empty for pawn)
        if (piece.type !== 'pawn') {
            notation += piece.type.charAt(0).toUpperCase();
        }
        
        // Capture
        if (captured || type === 'enpassant') {
            if (piece.type === 'pawn') {
                notation += String.fromCharCode(97 + from.col);
            }
            notation += 'x';
        }
        
        // Destination square
        notation += String.fromCharCode(97 + to.col) + (8 - to.row);
        
        // Promotion
        if (promotion) {
            notation += '=' + promotion.charAt(0).toUpperCase();
        }
        
        // Check/checkmate
        if (checkmate) {
            notation += '#';
        } else if (check) {
            notation += '+';
        }
        
        return notation;
    }
    
    isCheckmate(color) {
        if (!this.isInCheck(color)) return false;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const moves = this.generatePieceMoves(row, col);
                    if (moves.length > 0) return false;
                }
            }
        }
        return true;
    }
    
    isStalemate() {
        if (this.isInCheck(this.currentPlayer)) return false;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === this.currentPlayer) {
                    const moves = this.generatePieceMoves(row, col);
                    if (moves.length > 0) return false;
                }
            }
        }
        return true;
    }
    
    isDraw() {
        // 50-move rule
        if (this.halfmoveClock >= 100) return true;
        
        // Insufficient material
        const pieces = { white: [], black: [] };
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type !== 'king') {
                    pieces[piece.color].push(piece.type);
                }
            }
        }
        
        const whitePieces = pieces.white.length;
        const blackPieces = pieces.black.length;
        
        // K vs K
        if (whitePieces === 0 && blackPieces === 0) return true;
        
        // K vs K+N or K vs K+B
        if ((whitePieces === 0 && blackPieces === 1 && (pieces.black[0] === 'knight' || pieces.black[0] === 'bishop')) ||
            (blackPieces === 0 && whitePieces === 1 && (pieces.white[0] === 'knight' || pieces.white[0] === 'bishop'))) {
            return true;
        }
        
        return false;
    }
    
    // Simple AI that picks a random legal move
    getBestMove() {
        const moves = this.getAllLegalMoves(this.currentPlayer);
        if (moves.length === 0) return null;
        
        // Simple random move selection
        const randomIndex = Math.floor(Math.random() * moves.length);
        return moves[randomIndex];
    }
    
    getAllLegalMoves(color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const pieceMoves = this.generatePieceMoves(row, col);
                    for (let move of pieceMoves) {
                        moves.push({
                            from: { row, col },
                            to: { row: move.row, col: move.col },
                            piece: piece.type,
                            type: move.type
                        });
                    }
                }
            }
        }
        return moves;
    }
    
    getBoardSnapshot() {
        return {
            board: this.board.map(row => row.map(cell => cell ? { ...cell } : null)),
            currentPlayer: this.currentPlayer,
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
            hasKingMoved: { ...this.hasKingMoved },
            hasRookMoved: JSON.parse(JSON.stringify(this.hasRookMoved)),
            enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : null,
            halfmoveClock: this.halfmoveClock,
            fullmoveNumber: this.fullmoveNumber,
            kingPositions: JSON.parse(JSON.stringify(this.kingPositions)),
            capturedPieces: {
                white: this.capturedPieces.white.map(p => ({ ...p })),
                black: this.capturedPieces.black.map(p => ({ ...p }))
            },
            isGameOver: this.isGameOver,
            lastMove: this.lastMove ? { ...this.lastMove, from: { ...this.lastMove.from }, to: { ...this.lastMove.to } } : null
        };
    }
    
    restoreBoardSnapshot(snapshot) {
        this.board = snapshot.board;
        this.currentPlayer = snapshot.currentPlayer;
        this.castlingRights = snapshot.castlingRights;
        this.hasKingMoved = snapshot.hasKingMoved;
        this.hasRookMoved = snapshot.hasRookMoved;
        this.enPassantTarget = snapshot.enPassantTarget;
        this.halfmoveClock = snapshot.halfmoveClock;
        this.fullmoveNumber = snapshot.fullmoveNumber;
        this.kingPositions = snapshot.kingPositions;
        this.capturedPieces = snapshot.capturedPieces;
        this.isGameOver = snapshot.isGameOver;
        this.lastMove = snapshot.lastMove;
    }
}

// UI Controller
class ChessUI {
    constructor() {
        this.game = new ChessGame();
        this.draggedPiece = null;
        this.draggedFrom = null;
        this.boardFlipped = false;
        
        // Timer state
        this.timers = { white: 600, black: 600 }; // seconds (default 10 min)
        this.timerInterval = null;
        this.activeTimer = null;
        this.timeoutColor = null;
        this.timersEnabled = false; // set to true when a game with timers starts
        // Maps select index → seconds: Bullet=60, Blitz=180, Rapid=600, Classical=1800
        this.timeControlValues = [60, 180, 600, 1800];
        
        console.log('Initializing Chess UI...');
        this.init();
    }
    
    async init() {
        await this.waitForDOM();
        this.setupEventListeners();
        this.initTheme();
        this.showWelcomeScreen();
        console.log('Chess UI initialized successfully');
    }
    
    waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Navigation buttons - handle both click and prevent any form submission
        const playAI = document.getElementById('playAI');
        const playLocal = document.getElementById('playLocal');
        const solvePuzzles = document.getElementById('solvePuzzles');
        
        if (playAI) {
            playAI.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Play AI clicked');
                this.showGameSetup('ai');
            });
        }
        
        if (playLocal) {
            playLocal.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Play Local clicked');
                this.startLocalGame();
            });
        }
        
        if (solvePuzzles) {
            solvePuzzles.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Solve Puzzles clicked');
                this.showWelcomeScreen();
            });
        }
        
        // Game setup modal
        const closeSetup = document.getElementById('closeSetup');
        const cancelSetup = document.getElementById('cancelSetup');
        const startGame = document.getElementById('startGame');
        
        if (closeSetup) {
            closeSetup.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal('gameSetupModal');
            });
        }
        if (cancelSetup) {
            cancelSetup.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal('gameSetupModal');
            });
        }
        if (startGame) {
            startGame.addEventListener('click', (e) => {
                e.preventDefault();
                this.startAIGame();
            });
        }
        
        // Settings modal
        const settingsBtn = document.getElementById('settingsBtn');
        const closeSettings = document.getElementById('closeSettings');
        const saveSettings = document.getElementById('saveSettings');
        const cancelSettings = document.getElementById('cancelSettings');
        
        // Theme toggle button
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });
        }
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSettings();
            });
        }
        if (closeSettings) {
            closeSettings.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal('settingsModal');
            });
        }
        if (saveSettings) {
            saveSettings.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }
        if (cancelSettings) {
            cancelSettings.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal('settingsModal');
            });
        }
        
        // Promotion modal
        const promotionPieces = document.getElementById('promotionPieces');
        if (promotionPieces) {
            promotionPieces.addEventListener('click', (e) => {
                if (e.target.classList.contains('promotion-piece')) {
                    e.preventDefault();
                    this.handlePromotion(e.target.dataset.piece);
                }
            });
        }
        
        // Game controls
        const flipBoard = document.getElementById('flipBoard');
        const undoMove = document.getElementById('undoMove');
        const resignGame = document.getElementById('resignGame');
        
        if (flipBoard) {
            flipBoard.addEventListener('click', (e) => {
                e.preventDefault();
                this.flipBoard();
            });
        }
        if (undoMove) {
            undoMove.addEventListener('click', (e) => {
                e.preventDefault();
                this.undoMove();
            });
        }
        if (resignGame) {
            resignGame.addEventListener('click', (e) => {
                e.preventDefault();
                this.resignGame();
            });
        }
        
        // Result modal
        const closeResult = document.getElementById('closeResult');
        const newGame = document.getElementById('newGame');
        const exportPGN = document.getElementById('exportPGN');
        const reviewGame = document.getElementById('reviewGame');
        
        if (closeResult) {
            closeResult.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal('gameResultModal');
            });
        }
        if (newGame) {
            newGame.addEventListener('click', (e) => {
                e.preventDefault();
                this.startNewGame();
            });
        }
        if (exportPGN) {
            exportPGN.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportGame();
            });
        }
        if (reviewGame) {
            reviewGame.addEventListener('click', (e) => {
                e.preventDefault();
                this.reviewGame();
            });
        }
        
        console.log('Event listeners setup complete');
    }
    
    showWelcomeScreen() {
        console.log('Showing welcome screen');
        this.hideAllScreens();
        const welcomeScreen = document.getElementById('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.classList.remove('hidden');
            console.log('Welcome screen shown');
        }
    }
    
    hideAllScreens() {
        console.log('Hiding all screens');
        const screens = ['welcomeScreen', 'gameInterface', 'puzzleInterface'];
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) {
                screen.classList.add('hidden');
            }
        });
    }
    
    showGameSetup(mode) {
        console.log('Showing game setup for mode:', mode);
        this.game.gameMode = mode;
        this.showModal('gameSetupModal');
    }
    
    startLocalGame() {
        console.log('Starting local game');
        this.game.gameMode = 'local';
        this.game.setupStartingPosition();
        this.showGameInterface();
        this.renderBoard();
        this.updateGameInfo();
        this.updateCastlingRights();
        
        // Initialize timers with default 10-minute control for local games
        const timeSeconds = this.timeControlValues[2]; // Rapid - 10 min
        this.timers = { white: timeSeconds, black: timeSeconds };
        this.timeoutColor = null;
        this.timersEnabled = true;
        this.startClock('white');
        
        console.log('Local game started successfully');
    }
    
    startAIGame() {
        console.log('Starting AI game');
        try {
            const difficulty = parseInt(document.getElementById('difficultySelect')?.value) || 1;
            const color = document.getElementById('colorSelect')?.value || 'white';
            const timeControlIndex = parseInt(document.getElementById('timeControlSelect')?.value) || 1;
            
            this.game.aiSettings = { difficulty, color: color === 'white' ? 'black' : 'white' };
            
            if (color === 'random') {
                this.game.aiSettings.color = Math.random() < 0.5 ? 'white' : 'black';
            }
            
            this.hideModal('gameSetupModal');
            this.game.setupStartingPosition();
            this.showGameInterface();
            this.renderBoard();
            this.updateGameInfo();
            this.updateCastlingRights();
            
            // Initialize timers from selected time control
            const timeSeconds = this.timeControlValues[timeControlIndex];
            this.timers = { white: timeSeconds, black: timeSeconds };
            this.timeoutColor = null;
            this.timersEnabled = true;
            this.startClock('white');
            
            // If AI plays white, make first move
            if (this.game.aiSettings.color === 'white') {
                setTimeout(() => this.makeAIMove(), 1000);
            }
            
            console.log('AI game started successfully');
        } catch (error) {
            console.error('Error starting AI game:', error);
        }
    }
    
    showGameInterface() {
        console.log('Showing game interface');
        this.hideAllScreens();
        const gameInterface = document.getElementById('gameInterface');
        if (gameInterface) {
            gameInterface.classList.remove('hidden');
            console.log('Game interface shown');
        }
    }
    
    showModal(modalId) {
        console.log('Showing modal:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    
    hideModal(modalId) {
        console.log('Hiding modal:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    renderBoard(boardId = 'chessBoard') {
        console.log('Rendering board:', boardId);
        try {
            const boardElement = document.getElementById(boardId);
            if (!boardElement) {
                console.error('Board element not found:', boardId);
                return;
            }
            
            // Apply board theme + piece style class
            boardElement.className = `chess-board board-theme-${this.game.settings.boardTheme} pieces-${this.game.settings.pieceStyle}`;
            
            boardElement.innerHTML = '';
            
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    // When flipped, reverse both row and col so black plays from bottom
                    const boardRow = this.boardFlipped ? 7 - row : row;
                    const boardCol = this.boardFlipped ? 7 - col : col;
                    
                    const square = document.createElement('div');
                    square.className = `chess-square ${(boardRow + boardCol) % 2 === 0 ? 'light' : 'dark'}`;
                    // Store actual board coordinates so click/drag handlers work correctly
                    square.dataset.row = boardRow;
                    square.dataset.col = boardCol;
                    
                    const piece = this.game.board[boardRow][boardCol];
                    if (piece) {
                        const pieceElement = document.createElement('div');
                        pieceElement.className = `chess-piece ${piece.color}`;
                        pieceElement.textContent = this.game.pieceSymbols[piece.color][piece.type];
                        pieceElement.draggable = true;
                        square.appendChild(pieceElement);
                        
                        pieceElement.addEventListener('dragstart', (e) => this.handleDragStart(e));
                    }
                    
                    // Add event listeners
                    square.addEventListener('click', (e) => this.handleSquareClick(e));
                    square.addEventListener('dragover', (e) => this.handleDragOver(e));
                    square.addEventListener('drop', (e) => this.handleDrop(e));
                    
                    boardElement.appendChild(square);
                }
            }
            
            this.highlightSquares();
            console.log('Board rendered successfully');
        } catch (error) {
            console.error('Error rendering board:', error);
        }
    }
    
    handleSquareClick(e) {
        console.log('Square clicked');
        try {
            const square = e.currentTarget;
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            
            console.log('Square clicked:', row, col);
            
            if (this.game.selectedSquare) {
                // Try to make move
                const fromRow = this.game.selectedSquare.row;
                const fromCol = this.game.selectedSquare.col;
                
                if (fromRow === row && fromCol === col) {
                    // Clicking same square - deselect
                    this.game.selectedSquare = null;
                    this.game.legalMoves = [];
                    this.renderBoard();
                    return;
                }
                
                console.log('Attempting move from', fromRow, fromCol, 'to', row, col);
                
                const result = this.game.makeMove(fromRow, fromCol, row, col);
                
                if (result === 'promotion') {
                    // Show promotion modal
                    this.updatePromotionModal(this.game.currentPlayer);
                    this.showModal('promotionModal');
                    return;
                } else if (result === true) {
                    console.log('Move successful');
                    this.game.selectedSquare = null;
                    this.game.legalMoves = [];
                    this.renderBoard();
                    this.updateGameInfo();
                    this.updateMoveHistory();
                    this.updateCastlingRights();
                    this.switchClock();
                    
                    if (this.game.isGameOver) {
                        this.stopClock();
                        setTimeout(() => this.showGameResult(), 500);
                    } else if (this.game.gameMode === 'ai' && this.game.currentPlayer === this.game.aiSettings?.color) {
                        setTimeout(() => this.makeAIMove(), 500);
                    }
                } else {
                    console.log('Move failed, trying to select new piece');
                    // Try to select new piece
                    this.selectSquare(row, col);
                }
            } else {
                this.selectSquare(row, col);
            }
        } catch (error) {
            console.error('Error handling square click:', error);
        }
    }
    
    selectSquare(row, col) {
        console.log('Selecting square:', row, col);
        try {
            const piece = this.game.board[row][col];
            if (piece && piece.color === this.game.currentPlayer && 
                (this.game.gameMode !== 'ai' || this.game.currentPlayer !== this.game.aiSettings?.color)) {
                this.game.selectedSquare = { row, col };
                this.game.legalMoves = this.game.generatePieceMoves(row, col);
                console.log('Selected piece:', piece, 'Legal moves:', this.game.legalMoves.length);
                this.renderBoard();
            } else {
                console.log('Cannot select piece:', piece ? `${piece.color} ${piece.type}` : 'empty');
                this.game.selectedSquare = null;
                this.game.legalMoves = [];
                this.renderBoard();
            }
        } catch (error) {
            console.error('Error selecting square:', error);
        }
    }
    
    handleDragStart(e) {
        console.log('Drag started');
        try {
            const square = e.target.parentElement;
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            
            const piece = this.game.board[row][col];
            if (!piece || piece.color !== this.game.currentPlayer) {
                e.preventDefault();
                return;
            }
            
            if (this.game.gameMode === 'ai' && this.game.currentPlayer === this.game.aiSettings?.color) {
                e.preventDefault();
                return;
            }
            
            this.draggedPiece = e.target;
            this.draggedFrom = { row, col };
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');
            
            e.target.classList.add('dragging');
            
            // Set legal moves for highlighting
            this.game.selectedSquare = { row, col };
            this.game.legalMoves = this.game.generatePieceMoves(row, col);
            this.renderBoard();
            
        } catch (error) {
            console.error('Error in drag start:', error);
        }
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    handleDrop(e) {
        console.log('Drop event');
        try {
            e.preventDefault();
            
            if (!this.draggedFrom) return;
            
            const square = e.currentTarget;
            const toRow = parseInt(square.dataset.row);
            const toCol = parseInt(square.dataset.col);
            
            console.log('Dropping piece at:', toRow, toCol);
            
            const result = this.game.makeMove(this.draggedFrom.row, this.draggedFrom.col, toRow, toCol);
            
            if (result === 'promotion') {
                // Show promotion modal
                this.updatePromotionModal(this.game.currentPlayer);
                this.showModal('promotionModal');
            } else if (result === true) {
                this.game.selectedSquare = null;
                this.game.legalMoves = [];
                this.renderBoard();
                this.updateGameInfo();
                this.updateMoveHistory();
                this.updateCastlingRights();
                this.switchClock();
                
                if (this.game.isGameOver) {
                    this.stopClock();
                    setTimeout(() => this.showGameResult(), 500);
                } else if (this.game.gameMode === 'ai' && this.game.currentPlayer === this.game.aiSettings?.color) {
                    setTimeout(() => this.makeAIMove(), 500);
                }
            } else {
                this.renderBoard();
            }
            
            if (this.draggedPiece) {
                this.draggedPiece.classList.remove('dragging');
            }
            
            this.draggedPiece = null;
            this.draggedFrom = null;
        } catch (error) {
            console.error('Error in drop:', error);
        }
    }
    
    updatePromotionModal(color) {
        const pieces = document.querySelectorAll('.promotion-piece');
        pieces.forEach(piece => {
            const pieceType = piece.dataset.piece;
            piece.textContent = this.game.pieceSymbols[color][pieceType];
            piece.className = `promotion-piece ${color}`;
        });
    }
    
    handlePromotion(pieceType) {
        if (this.game.promotionMove) {
            const { fromRow, fromCol, toRow, toCol, move } = this.game.promotionMove;
            
            if (this.game.executeMoveInternal(fromRow, fromCol, toRow, toCol, move, pieceType)) {
                this.game.selectedSquare = null;
                this.game.legalMoves = [];
                this.game.promotionMove = null;
                
                this.hideModal('promotionModal');
                this.renderBoard();
                this.updateGameInfo();
                this.updateMoveHistory();
                this.updateCastlingRights();
                this.switchClock();
                
                if (this.game.isGameOver) {
                    this.stopClock();
                    setTimeout(() => this.showGameResult(), 500);
                } else if (this.game.gameMode === 'ai' && this.game.currentPlayer === this.game.aiSettings?.color) {
                    setTimeout(() => this.makeAIMove(), 500);
                }
            }
        }
    }
    
    highlightSquares() {
        try {
            const squares = document.querySelectorAll('.chess-square');
            
            squares.forEach(square => {
                square.classList.remove('selected', 'legal-move', 'capture-move', 'castle-move', 'in-check', 'last-move');
            });
            
            // Highlight last move
            if (this.game.lastMove) {
                const { from, to } = this.game.lastMove;
                const fromSquare = document.querySelector(`[data-row="${from.row}"][data-col="${from.col}"]`);
                const toSquare = document.querySelector(`[data-row="${to.row}"][data-col="${to.col}"]`);
                if (fromSquare) fromSquare.classList.add('last-move');
                if (toSquare) toSquare.classList.add('last-move');
            }
            
            if (this.game.selectedSquare) {
                const selectedSquare = document.querySelector(
                    `[data-row="${this.game.selectedSquare.row}"][data-col="${this.game.selectedSquare.col}"]`
                );
                if (selectedSquare) {
                    selectedSquare.classList.add('selected');
                }
                
                if (this.game.settings.showLegalMoves === 'on') {
                    this.game.legalMoves.forEach(move => {
                        const moveSquare = document.querySelector(
                            `[data-row="${move.row}"][data-col="${move.col}"]`
                        );
                        if (moveSquare) {
                            if (move.type === 'castle-kingside' || move.type === 'castle-queenside') {
                                moveSquare.classList.add('castle-move');
                            } else if (move.type === 'capture' || move.type === 'enpassant' || move.type === 'promotion-capture') {
                                moveSquare.classList.add('capture-move');
                            } else {
                                moveSquare.classList.add('legal-move');
                            }
                        }
                    });
                }
            }
            
            // Highlight king in check
            if (this.game.isInCheck(this.game.currentPlayer)) {
                const kingPos = this.game.kingPositions[this.game.currentPlayer];
                if (kingPos) {
                    const kingSquare = document.querySelector(
                        `[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`
                    );
                    if (kingSquare) {
                        kingSquare.classList.add('in-check');
                    }
                }
            }
        } catch (error) {
            console.error('Error highlighting squares:', error);
        }
    }
    
    updateCastlingRights() {
        try {
            const whiteKingside = document.getElementById('whiteKingside');
            const whiteQueenside = document.getElementById('whiteQueenside');
            const blackKingside = document.getElementById('blackKingside');
            const blackQueenside = document.getElementById('blackQueenside');
            
            if (whiteKingside) {
                whiteKingside.className = `castling-indicator ${this.game.castlingRights.white.kingside ? 'available' : 'unavailable'}`;
            }
            if (whiteQueenside) {
                whiteQueenside.className = `castling-indicator ${this.game.castlingRights.white.queenside ? 'available' : 'unavailable'}`;
            }
            if (blackKingside) {
                blackKingside.className = `castling-indicator ${this.game.castlingRights.black.kingside ? 'available' : 'unavailable'}`;
            }
            if (blackQueenside) {
                blackQueenside.className = `castling-indicator ${this.game.castlingRights.black.queenside ? 'available' : 'unavailable'}`;
            }
        } catch (error) {
            console.error('Error updating castling rights:', error);
        }
    }
    
    makeAIMove() {
        console.log('Making AI move');
        try {
            if (this.game.isGameOver) return;
            
            setTimeout(() => {
                try {
                    const move = this.game.getBestMove();
                    if (move) {
                        console.log('AI move:', move);
                        const result = this.game.makeMove(
                            move.from.row,
                            move.from.col,
                            move.to.row,
                            move.to.col
                        );
                        
                        if (result === true) {
                            this.renderBoard();
                            this.updateGameInfo();
                            this.updateMoveHistory();
                            this.updateCastlingRights();
                            this.switchClock();
                            
                            if (this.game.isGameOver) {
                                this.stopClock();
                                setTimeout(() => this.showGameResult(), 500);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error in AI move:', error);
                }
            }, 1000);
        } catch (error) {
            console.error('Error making AI move:', error);
        }
    }
    
    updateGameInfo() {
        try {
            const statusElement = document.getElementById('gameStatus');
            if (statusElement) {
                if (this.game.isGameOver) {
                    if (this.game.isCheckmate(this.game.currentPlayer)) {
                        const winner = this.game.currentPlayer === 'white' ? 'Black' : 'White';
                        statusElement.innerHTML = `<div class="status status--error">Checkmate! ${winner} wins</div>`;
                    } else if (this.game.isStalemate()) {
                        statusElement.innerHTML = `<div class="status status--warning">Stalemate! Draw</div>`;
                    } else if (this.game.isDraw()) {
                        statusElement.innerHTML = `<div class="status status--warning">Draw</div>`;
                    }
                } else {
                    const currentPlayerName = this.game.currentPlayer === 'white' ? 'White' : 'Black';
                    const statusClass = this.game.isInCheck(this.game.currentPlayer) ? 'status--warning' : 'status--info';
                    const statusText = this.game.isInCheck(this.game.currentPlayer) ? 'Check!' : 'to move';
                    statusElement.innerHTML = `<div class="status ${statusClass}">${currentPlayerName} ${statusText}</div>`;
                }
            }
            
            // Update captured pieces
            this.updateCapturedPieces();
        } catch (error) {
            console.error('Error updating game info:', error);
        }
    }
    
    updateCapturedPieces() {
        try {
            const capturedByPlayer = document.getElementById('capturedByPlayer');
            const capturedByOpponent = document.getElementById('capturedByOpponent');
            
            if (capturedByPlayer) {
                capturedByPlayer.innerHTML = '';
                this.game.capturedPieces.white.forEach(piece => {
                    const pieceElement = document.createElement('span');
                    pieceElement.className = 'captured-piece';
                    pieceElement.textContent = this.game.pieceSymbols[piece.color][piece.type];
                    capturedByPlayer.appendChild(pieceElement);
                });
            }
            
            if (capturedByOpponent) {
                capturedByOpponent.innerHTML = '';
                this.game.capturedPieces.black.forEach(piece => {
                    const pieceElement = document.createElement('span');
                    pieceElement.className = 'captured-piece';
                    pieceElement.textContent = this.game.pieceSymbols[piece.color][piece.type];
                    capturedByOpponent.appendChild(pieceElement);
                });
            }
        } catch (error) {
            console.error('Error updating captured pieces:', error);
        }
    }
    
    updateMoveHistory() {
        try {
            const historyElement = document.getElementById('moveHistory');
            if (!historyElement) return;
            
            historyElement.innerHTML = '';
            
            for (let i = 0; i < this.game.moveHistory.length; i += 2) {
                const moveNumber = Math.floor(i / 2) + 1;
                const movePair = document.createElement('div');
                movePair.className = 'move-pair';
                
                const numberElement = document.createElement('span');
                numberElement.className = 'move-number';
                numberElement.textContent = `${moveNumber}.`;
                movePair.appendChild(numberElement);
                
                const whiteMove = document.createElement('span');
                whiteMove.className = 'move-notation';
                whiteMove.textContent = this.game.moveHistory[i].notation;
                movePair.appendChild(whiteMove);
                
                if (i + 1 < this.game.moveHistory.length) {
                    const blackMove = document.createElement('span');
                    blackMove.className = 'move-notation';
                    blackMove.textContent = this.game.moveHistory[i + 1].notation;
                    movePair.appendChild(blackMove);
                }
                
                historyElement.appendChild(movePair);
            }
            
            // Scroll to bottom
            historyElement.scrollTop = historyElement.scrollHeight;
        } catch (error) {
            console.error('Error updating move history:', error);
        }
    }
    
    flipBoard() {
        this.boardFlipped = !this.boardFlipped;
        this.renderBoard();
    }
    
    undoMove() {
        if (this.game.boardHistory.length === 0) return;
        
        // In AI mode, undo both the AI's last move and the player's move before it.
        // boardHistory stores the state BEFORE each move, so we discard the snapshot
        // saved before the AI move (not needed) and restore the one saved before the
        // player's move.
        if (this.game.gameMode === 'ai' && this.game.boardHistory.length >= 2) {
            this.game.boardHistory.pop();  // discard AI pre-move snapshot
            this.game.moveHistory.pop();   // remove AI move notation
            this.game.restoreBoardSnapshot(this.game.boardHistory.pop()); // restore to before player's move
            this.game.moveHistory.pop();   // remove player move notation
        } else {
            this.game.restoreBoardSnapshot(this.game.boardHistory.pop());
            this.game.moveHistory.pop();
        }
        
        this.game.selectedSquare = null;
        this.game.legalMoves = [];
        
        // Resume the correct player's timer after undo (if timers were enabled)
        if (this.timersEnabled) {
            this.startClock(this.game.currentPlayer);
        }
        
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateCastlingRights();
    }
    
    resignGame() {
        this.stopClock();
        this.game.isGameOver = true;
        this.showGameResult();
    }
    
    showGameResult() {
        try {
            this.stopClock();
            
            let title = 'Game Over';
            let message = '';
            
            if (this.timeoutColor) {
                const winner = this.timeoutColor === 'white' ? 'Black' : 'White';
                title = 'Time Out!';
                message = `${winner} wins on time`;
            } else if (this.game.isCheckmate(this.game.currentPlayer)) {
                const winner = this.game.currentPlayer === 'white' ? 'Black' : 'White';
                title = 'Checkmate!';
                message = `${winner} wins by checkmate`;
            } else if (this.game.isStalemate()) {
                title = 'Stalemate!';
                message = 'The game is a draw';
            } else if (this.game.isDraw()) {
                title = 'Draw!';
                message = 'The game is a draw';
            } else {
                title = 'Game Over';
                message = 'Game ended';
            }
            
            const resultTitle = document.getElementById('resultTitle');
            const resultMessage = document.getElementById('resultMessage');
            const gameSummary = document.getElementById('gameSummary');
            
            if (resultTitle) resultTitle.textContent = title;
            if (resultMessage) resultMessage.textContent = message;
            if (gameSummary) {
                const summary = `Moves: ${this.game.moveHistory.length}`;
                gameSummary.textContent = summary;
            }
            
            this.showModal('gameResultModal');
        } catch (error) {
            console.error('Error showing game result:', error);
        }
    }
    
    startNewGame() {
        this.stopClock();
        this.timersEnabled = false;
        this.timeoutColor = null;
        this.hideModal('gameResultModal');
        if (this.game.gameMode === 'ai') {
            this.showGameSetup('ai');
        } else {
            this.startLocalGame();
        }
    }
    
    exportGame() {
        try {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            let pgn = `[Event "Chess Master Game"]\n`;
            pgn += `[Date "${dateStr}"]\n`;
            pgn += `[White "White"]\n`;
            pgn += `[Black "Black"]\n`;
            pgn += `[Result "*"]\n\n`;
            
            for (let i = 0; i < this.game.moveHistory.length; i += 2) {
                const moveNum = Math.floor(i / 2) + 1;
                pgn += `${moveNum}. ${this.game.moveHistory[i].notation}`;
                if (i + 1 < this.game.moveHistory.length) {
                    pgn += ` ${this.game.moveHistory[i + 1].notation}`;
                }
                pgn += ' ';
            }
            pgn += '*';
            
            // Copy to clipboard if available, otherwise show in alert
            if (navigator.clipboard) {
                navigator.clipboard.writeText(pgn).then(() => {
                    alert('PGN copied to clipboard!');
                }).catch(() => {
                    alert(pgn);
                });
            } else {
                alert(pgn);
            }
        } catch (error) {
            console.error('Error exporting game:', error);
            alert('Export feature requires modern browser support');
        }
    }
    
    reviewGame() {
        alert('Review game - feature coming soon');
        this.hideModal('gameResultModal');
    }
    
    // ── Timer Methods ──────────────────────────────────────────────────────────
    
    startClock(color) {
        this.stopClock();
        this.activeTimer = color;
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            if (this.timers[this.activeTimer] > 0) {
                this.timers[this.activeTimer]--;
                this.updateTimerDisplay();
                if (this.timers[this.activeTimer] <= 0) {
                    this.stopClock();
                    this.handleTimeOut(this.activeTimer);
                }
            }
        }, 1000);
    }
    
    stopClock() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.activeTimer = null;
        this.updateTimerDisplay();
    }
    
    switchClock() {
        // Only switch if timers are running (activeTimer was set when game started)
        if (this.game.isGameOver) {
            this.stopClock();
            return;
        }
        // Start the clock for whoever's turn it now is
        this.startClock(this.game.currentPlayer);
    }
    
    formatTime(seconds) {
        if (seconds <= 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    updateTimerDisplay() {
        const playerTimerEl = document.getElementById('playerTimer');
        const opponentTimerEl = document.getElementById('opponentTimer');
        
        // playerTimer (bottom) = white; opponentTimer (top) = black
        if (playerTimerEl) {
            playerTimerEl.textContent = this.formatTime(this.timers.white);
            playerTimerEl.className = 'timer' +
                (this.activeTimer === 'white' ? ' active' : '') +
                (this.timers.white > 0 && this.timers.white <= 30 ? ' low-time' : '');
        }
        if (opponentTimerEl) {
            opponentTimerEl.textContent = this.formatTime(this.timers.black);
            opponentTimerEl.className = 'timer' +
                (this.activeTimer === 'black' ? ' active' : '') +
                (this.timers.black > 0 && this.timers.black <= 30 ? ' low-time' : '');
        }
    }
    
    handleTimeOut(color) {
        this.game.isGameOver = true;
        this.timeoutColor = color;
        this.showGameResult();
    }
    
    // ── Settings Methods ───────────────────────────────────────────────────────
    
    showSettings() {
        try {
            const boardTheme = document.getElementById('boardTheme');
            const pieceStyle = document.getElementById('pieceStyle');
            const soundEffects = document.getElementById('soundEffects');
            const showLegalMoves = document.getElementById('showLegalMoves');
            
            if (boardTheme) boardTheme.value = this.game.settings.boardTheme;
            if (pieceStyle) pieceStyle.value = this.game.settings.pieceStyle;
            if (soundEffects) soundEffects.value = this.game.settings.soundEffects;
            if (showLegalMoves) showLegalMoves.value = this.game.settings.showLegalMoves;
            
            this.showModal('settingsModal');
        } catch (error) {
            console.error('Error showing settings:', error);
        }
    }
    
    saveSettings() {
        try {
            const boardTheme = document.getElementById('boardTheme');
            const pieceStyle = document.getElementById('pieceStyle');
            const soundEffects = document.getElementById('soundEffects');
            const showLegalMoves = document.getElementById('showLegalMoves');
            
            if (boardTheme) this.game.settings.boardTheme = boardTheme.value;
            if (pieceStyle) {
                this.game.settings.pieceStyle = pieceStyle.value;
                this.applyPieceStyle(pieceStyle.value);
            }
            if (soundEffects) this.game.settings.soundEffects = soundEffects.value;
            if (showLegalMoves) this.game.settings.showLegalMoves = showLegalMoves.value;
            
            this.renderBoard();
            this.hideModal('settingsModal');
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
    
    // ── Theme Methods ─────────────────────────────────────────────────────────
    
    initTheme() {
        // Read persisted preference; fall back to OS preference
        const saved = localStorage.getItem('chessmaster-theme');
        let theme = saved;
        if (!theme) {
            theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        this.setTheme(theme);
    }
    
    toggleTheme() {
        const current = document.documentElement.dataset.colorScheme || 'light';
        this.setTheme(current === 'dark' ? 'light' : 'dark');
    }
    
    setTheme(theme) {
        document.documentElement.dataset.colorScheme = theme;
        localStorage.setItem('chessmaster-theme', theme);
    }
    
    applyPieceStyle(style) {
        const validStyles = ['classic', 'modern', 'letter'];
        const resolved = validStyles.includes(style) ? style : 'classic';
        this.game.pieceSymbols = this.game.pieceSymbolSets[resolved];
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing chess application...');
    try {
        window.chessUI = new ChessUI();
        console.log('Chess application initialized successfully');
    } catch (error) {
        console.error('Error initializing chess application:', error);
    }
});