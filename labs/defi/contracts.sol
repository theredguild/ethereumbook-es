// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Unidades internas ficticias de seis decimales. No son ERC-20.
contract AMMLedger {
    uint256 public constant UNIT = 1_000_000;
    uint256 public constant MAX_AMOUNT = 1_000 * UNIT;
    address[3] public actors;
    mapping(address => uint256) public walletX;
    mapping(address => uint256) public walletY;
    uint256 public reserveX = 1_000 * UNIT;
    uint256 public reserveY = 1_000 * UNIT;
    event Swap(address indexed trader, bool xToY, uint256 amountIn, uint256 amountOut, uint256 minOut);

    constructor(address alice, address bob, address carol) {
        actors = [alice, bob, carol];
        for (uint256 i; i < 3; ++i) {
            require(actors[i] != address(0), "actor");
            walletX[actors[i]] = MAX_AMOUNT;
            walletY[actors[i]] = MAX_AMOUNT;
        }
    }

    function quote(bool xToY, uint256 amountIn) public view returns (uint256 amountOut, uint256 spotOut, uint256 noFeeOut) {
        require(amountIn > 0 && amountIn <= MAX_AMOUNT, "amount bounds");
        uint256 rIn = xToY ? reserveX : reserveY;
        uint256 rOut = xToY ? reserveY : reserveX;
        amountOut = amountIn * 997 * rOut / (rIn * 1000 + amountIn * 997);
        spotOut = amountIn * rOut / rIn;
        noFeeOut = amountIn * rOut / (rIn + amountIn);
    }

    function swap(bool xToY, uint256 amountIn, uint256 minOut) external returns (uint256 amountOut) {
        require(msg.sender == actors[0] || msg.sender == actors[1] || msg.sender == actors[2], "actor");
        (amountOut,,) = quote(xToY, amountIn);
        require(amountOut > 0, "zero output");
        require(minOut > 0 && amountOut >= minOut, "minOut");
        if (xToY) {
            require(walletX[msg.sender] >= amountIn, "wallet X");
            walletX[msg.sender] -= amountIn;
            walletY[msg.sender] += amountOut;
            reserveX += amountIn;
            reserveY -= amountOut;
        } else {
            require(walletY[msg.sender] >= amountIn, "wallet Y");
            walletY[msg.sender] -= amountIn;
            walletX[msg.sender] += amountOut;
            reserveY += amountIn;
            reserveX -= amountOut;
        }
        emit Swap(msg.sender, xToY, amountIn, amountOut, minOut);
    }

    function state() external view returns (uint256 x, uint256 y, uint256[3] memory xs, uint256[3] memory ys) {
        for (uint256 i; i < 3; ++i) { xs[i] = walletX[actors[i]]; ys[i] = walletY[actors[i]]; }
        return (reserveX, reserveY, xs, ys);
    }
}

// Sin intereses, tokens transferibles, depositantes ni oraculo externo.
contract LoanLedger {
    uint256 public constant UNIT = 1_000_000;
    uint256 public constant MAX_AMOUNT = 1_000 * UNIT;
    address[3] public actors;
    mapping(address => uint256) public collateralWallet;
    mapping(address => uint256) public stableWallet;
    uint256 public collateral;
    uint256 public debt;
    uint256 public pool = 1_000 * UNIT;
    uint256 public price = 2 * UNIT;
    event Deposit(uint256 amount);
    event Borrow(uint256 amount);
    event Repay(uint256 amount);
    event Withdraw(uint256 amount);
    event PriceChanged(uint256 previous, uint256 current);
    event Liquidation(address indexed liquidator, uint256 repaid, uint256 seized);

    constructor(address alice, address bob, address carol) {
        require(alice != address(0) && bob != address(0) && carol != address(0), "actor");
        actors = [alice, bob, carol];
        collateralWallet[alice] = 100 * UNIT;
        stableWallet[bob] = 1_000 * UNIT;
    }

    modifier onlyAlice() { require(msg.sender == actors[0], "Alice only"); _; }
    function validAmount(uint256 amount) private pure { require(amount > 0 && amount <= MAX_AMOUNT, "amount bounds"); }
    function value() public view returns (uint256) { return collateral * price / UNIT; }
    function health() public view returns (uint256) { return debt == 0 ? type(uint256).max : value() * 750_000 / debt; }

    function deposit(uint256 amount) external onlyAlice {
        validAmount(amount);
        require(collateralWallet[msg.sender] >= amount, "collateral wallet");
        collateralWallet[msg.sender] -= amount;
        collateral += amount;
        emit Deposit(amount);
    }

    function borrow(uint256 amount) external onlyAlice {
        validAmount(amount);
        require(debt + amount <= value() / 2, "max LTV 50%");
        require(pool >= amount, "pool");
        debt += amount;
        pool -= amount;
        stableWallet[msg.sender] += amount;
        emit Borrow(amount);
    }

    function repay(uint256 amount) external onlyAlice {
        validAmount(amount);
        require(amount <= debt && stableWallet[msg.sender] >= amount, "repay funds/debt");
        stableWallet[msg.sender] -= amount;
        pool += amount;
        debt -= amount;
        emit Repay(amount);
    }

    function withdraw(uint256 amount) external onlyAlice {
        validAmount(amount);
        require(amount <= collateral, "escrow");
        uint256 remainingValue = (collateral - amount) * price / UNIT;
        require(debt <= remainingValue / 2, "max LTV 50%");
        collateral -= amount;
        collateralWallet[msg.sender] += amount;
        emit Withdraw(amount);
    }

    function setPrice(uint256 next) external onlyAlice {
        require(next >= 10_000 && next <= 10 * UNIT, "price bounds");
        emit PriceChanged(price, next);
        price = next;
    }

    function liquidate(uint256 amount) external {
        require(msg.sender == actors[1] || msg.sender == actors[2], "liquidator");
        validAmount(amount);
        require(debt * 100 > value() * 75, "healthy");
        require(amount <= debt / 2, "repay cap 50%");
        require(stableWallet[msg.sender] >= amount, "liquidator funds");
        uint256 seized = amount * 105 * UNIT / (price * 100);
        require(seized > 0 && seized <= collateral, "seize bounds; residual debt risk");
        stableWallet[msg.sender] -= amount;
        pool += amount;
        debt -= amount;
        collateral -= seized;
        collateralWallet[msg.sender] += seized;
        emit Liquidation(msg.sender, amount, seized);
    }

    function state() external view returns (uint256[3] memory cs, uint256[3] memory ss, uint256 escrow, uint256 owed, uint256 stablePool, uint256 currentPrice, uint256 currentHealth) {
        for (uint256 i; i < 3; ++i) { cs[i] = collateralWallet[actors[i]]; ss[i] = stableWallet[actors[i]]; }
        return (cs, ss, collateral, debt, pool, price, health());
    }
}
