// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract HUSTCoin is ERC20, Ownable {
    // Số thập phân: 18 (giống như ETH)
    uint8 private constant DECIMALS = 18;
    
    // Tổng cung ban đầu: 1 triệu token (sẽ được mint sau khi deploy)
    uint256 private constant INITIAL_SUPPLY = 1_000_000 * (10 ** uint256(DECIMALS));

    // Hàm khởi tạo
    constructor() ERC20("HUST Coin", "HUST") {
        // Mint toàn bộ token cho người deploy
        _mint(msg.sender, INITIAL_SUPPLY);
        _transferOwnership(msg.sender);
    }

    // Ghi đè hàm decimals để trả về số thập phân là 18
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    // Hàm mint token, chỉ có thể được gọi bởi owner
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
