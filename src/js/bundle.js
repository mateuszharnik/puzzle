'use strict';

(function() {
  var Puzzle = (function() {
    function Puzzle(config) {
      if (!(this instanceof Puzzle)) {
        return new Puzzle(config);
      } else {
        var defaultConfig = {
          wrapper: document.body,
          image: ''
        };
        this.testConfig(config);
        this.wrapper = config.wrapper || defaultConfig.wrapper;
        this.image = config.image || defaultConfig.image;

        if (typeof Storage !== 'undefined') {
          this.storageKey = this.image.slice(this.image.lastIndexOf('/') + 1, this.image.lastIndexOf('.'));
          this.recordFromLocalStorage = JSON.parse(localStorage.getItem(this.storageKey))
            ? JSON.parse(localStorage.getItem(this.storageKey))
            : null;
        }

        this.bottomPanel = null;
        this.resetButton = null;
        this.puzzleGame = null;
        this.gameWrapper = null;
        this.description = null;
        this.record = null;
        this.preview = null;
        this.hiddenBlock = null;
        this.countElement = null;
        this.handler = null;
        this.time = null;
        this.modal = null;
        this.isOver = false;
        this.blocks = [];
        this.count = 0;
      }
    }

    Puzzle.prototype.testConfig = function(config) {
      if (!(config instanceof Object)) {
        throw new Error('Argument must be object');
      }

      if (!(config.wrapper instanceof HTMLDivElement)) {
        throw new Error('Wrapper must be div element');
      }

      if (!(typeof config.image === 'string') || config.image === '') {
        throw new Error("Image must be type of string and can't be empty");
      }
    };

    Puzzle.prototype.checkImageSize = function() {
      var _this = this;

      var img = new Image();
      img.src = this.image;
      img.addEventListener('load', function() {
        var imgHeight = img.naturalHeight;
        var imgWidth = img.naturalWidth;

        if (imgHeight > 500 || imgWidth > 500) {
          _this.createWarning('duży');
        } else if (imgHeight < 400 || imgWidth < 400) {
          _this.createWarning('mały');
        }
      });

      if (img.complete) {
        var event = new Event('load');
        img.dispatchEvent(event);
      }
    };

    Puzzle.prototype.createWarning = function(size) {
      var warning = document.createElement('div');
      warning.classList.add('big-img-error');
      warning.textContent = 'Tw\xF3j obrazek jest za '.concat(
        size,
        '. Wymiary obrazka powinny wynosi\u0107 400px x 400px. Mog\u0105 wyst\u0119powa\u0107 problemy z dzia\u0142aniem programu.'
      );
      document.body.appendChild(warning);
    };

    Puzzle.prototype.createGameWrapper = function() {
      this.gameWrapper = document.createElement('div');
      this.gameWrapper.classList.add('game-wrapper');
      this.wrapper.appendChild(this.gameWrapper);
    };

    Puzzle.prototype.createCounter = function() {
      this.countElement = document.createElement('p');
      this.countElement.classList.add('puzzle-attempt-counter');
      this.countElement.textContent = 'Liczba ruch\xF3w: '.concat(this.count);
      this.gameWrapper.appendChild(this.countElement);
    };

    Puzzle.prototype.createPuzzleGameElement = function() {
      this.puzzleGame = document.createElement('div');
      this.puzzleGame.classList.add('puzzle-game');
      this.puzzleGame.setAttribute('tabindex', '0');

      if (this.resetButton) {
        this.gameWrapper.insertBefore(this.puzzleGame, this.bottomPanel);
      } else {
        this.gameWrapper.appendChild(this.puzzleGame);
      }
    };

    Puzzle.prototype.arrayShuffle = function(arr) {
      var x = null;
      var j = null;

      for (var i = arr.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = arr[i];
        arr[i] = arr[j];
        arr[j] = x;
      }

      return arr;
    };

    Puzzle.prototype.createBlocks = function() {
      for (var i = 1; i <= 15; i++) {
        var block = document.createElement('div');
        block.classList.add('puzzle');
        block.classList.add('img-'.concat(i < 10 ? '0' + i : i));
        block.style.backgroundImage = 'url('.concat(this.image, ')');
        this.blocks.push(block);
      }

      this.blocks = this.arrayShuffle(this.blocks);
      this.blocks.forEach(function(block, index) {
        block.classList.add('puzzle-'.concat(index + 1 < 10 ? '0' + (index + 1) : index + 1));
      });
      this.blocks.push(this.createHiddenBlock());
    };

    Puzzle.prototype.createHiddenBlock = function() {
      // this.hiddenBlock is last element in puzzle
      this.hiddenBlock = document.createElement('div');
      this.hiddenBlock.classList.add('puzzle');
      this.hiddenBlock.classList.add('img-16');
      this.hiddenBlock.classList.add('puzzle-16');
      this.hiddenBlock.classList.add('hide');
      this.hiddenBlock.style.backgroundImage = 'url('.concat(this.image, ')');
      return this.hiddenBlock;
    };

    Puzzle.prototype.addBlocksToPuzzleGame = function() {
      var _this2 = this;

      this.blocks.forEach(function(block) {
        _this2.puzzleGame.appendChild(block);
      });
      this.time = parseFloat(getComputedStyle(this.hiddenBlock).transitionDuration) * 1000;
    };

    Puzzle.prototype.addEventsOnPuzzleGame = function() {
      var _this3 = this;

      this.handler = this.throttle(this.checkWhatKeyIsPress, this.time);
      this.puzzleGame.addEventListener('keydown', this.handler);
      this.puzzleGame.addEventListener('focus', function() {
        return _this3.puzzleGame.parentElement.classList.add('is-focused');
      });
      this.puzzleGame.addEventListener('blur', function() {
        return _this3.puzzleGame.parentElement.classList.remove('is-focused');
      });
    };

    Puzzle.prototype.throttle = function(callback, time) {
      var _this4 = this;

      var wait = false;
      return function(e) {
        if (!wait) {
          wait = true;
          callback.call(_this4, e);
          setTimeout(function() {
            wait = false;
          }, time - 150);
        }
      };
    };

    Puzzle.prototype.isGameOver = function(end) {
      var _this5 = this;

      if (end) {
        setTimeout(function() {
          _this5.countElement.textContent = 'Gratulacje - Tw\xF3j wynik to '.concat(_this5.count);

          _this5.hiddenBlock.classList.remove('hide');

          _this5.setInLocalStorage(_this5.count);

          _this5.isOver = true;
        }, this.time);
        this.puzzleGame.removeEventListener('keydown', this.handler);
      }
    };

    Puzzle.prototype.checkWhatKeyIsPress = function(e) {
      var key = e.keyCode; // For IE because e.target should be .puzzle-wrapper but is .puzzle

      if (e.target !== this.puzzleGame) {
        this.puzzleGame.focus();
      }

      this.isGameOver(this.changeDirection(key));
    };

    Puzzle.prototype.changeDirection = function(key) {
      var position = this.blocks.indexOf(this.hiddenBlock);

      if (key === 37) {
        if (
          typeof this.blocks[position - 1] !== 'undefined' &&
          position - 1 !== 11 &&
          position - 1 !== 7 &&
          position - 1 !== 3
        ) {
          this.changePuzzleBlock(position, position - 1);
          return this.checkOrder();
        } else {
          return false;
        }
      } else if (key === 38) {
        if (typeof this.blocks[position - 4] !== 'undefined') {
          this.changePuzzleBlock(position, position - 4);
          return this.checkOrder();
        } else {
          return false;
        }
      } else if (key === 39) {
        if (
          typeof this.blocks[position + 1] !== 'undefined' &&
          position + 1 !== 12 &&
          position + 1 !== 8 &&
          position + 1 !== 4
        ) {
          this.changePuzzleBlock(position, position + 1);
          return this.checkOrder();
        } else {
          return false;
        }
      } else if (key === 40) {
        if (typeof this.blocks[position + 4] !== 'undefined') {
          this.changePuzzleBlock(position, position + 4);
          return this.checkOrder();
        } else {
          return false;
        }
      }
    };

    Puzzle.prototype.increaseCount = function() {
      this.count++;
      this.countElement.textContent = 'Liczba ruch\xF3w: '.concat(this.count);
      return true;
    };

    Puzzle.prototype.changePositionInArray = function(hiddenEl, siblingEl) {
      var temp = this.blocks[siblingEl]; // Swap hiddenEl with siblingEl in array

      this.blocks.splice(siblingEl, 1, this.blocks[hiddenEl]);
      this.blocks.splice(hiddenEl, 1, temp);
      return this.increaseCount();
    };

    Puzzle.prototype.changePuzzleBlock = function(hidden, sibling) {
      var hiddenElementClassName = 'puzzle-'.concat(
        parseInt(hidden) + 1 < 10 ? '0' + (parseInt(hidden) + 1) : parseInt(hidden) + 1
      );
      var siblingElementClassName = 'puzzle-'.concat(
        parseInt(sibling) + 1 < 10 ? '0' + (parseInt(sibling) + 1) : parseInt(sibling) + 1
      );
      this.blocks[hidden].classList.remove(hiddenElementClassName);
      this.blocks[hidden].classList.add(siblingElementClassName);
      this.blocks[sibling].classList.remove(siblingElementClassName);
      this.blocks[sibling].classList.add(hiddenElementClassName);
      return this.changePositionInArray(hidden, sibling);
    };

    Puzzle.prototype.checkOrder = function() {
      // This function check if game should be over
      var currentOrder = this.blocks.filter(function(block) {
        return (
          block.className.substr(block.className.indexOf('img-') + 'img-'.length, 2) ===
          block.className.substr(block.className.indexOf('puzzle-') + 'puzzle-'.length, 2)
        );
      });

      if (currentOrder.length === this.blocks.length) {
        return true;
      } else {
        return false;
      }
    };

    Puzzle.prototype.setInLocalStorage = function(score) {
      if (typeof Storage !== 'undefined') {
        if (this.recordFromLocalStorage === null || score < parseInt(this.recordFromLocalStorage)) {
          localStorage.setItem(this.storageKey, JSON.stringify(score));
          this.record.textContent = 'Tw\xF3j obecny rekord: '.concat(score);
        }
      }
    };

    Puzzle.prototype.createBottomPanel = function() {
      this.bottomPanel = document.createElement('div');
      this.bottomPanel.classList.add('puzzle-bottom-panel');
      this.gameWrapper.appendChild(this.bottomPanel);

      if (typeof Storage !== 'undefined') {
        this.record = document.createElement('p');
        this.record.classList.add('puzzle-record');

        if (this.recordFromLocalStorage === null) {
          this.record.textContent = 'Brak rekordu';
        } else {
          this.record.textContent = 'Tw\xF3j obecny rekord: '.concat(Number(this.recordFromLocalStorage));
        }

        this.bottomPanel.appendChild(this.record);
      }

      this.preview = document.createElement('button');
      this.preview.classList.add('puzzle-preview');
      this.preview.type = 'button';
      this.preview.title = 'Naciśnij lewy przycisk myszy aby zobaczyć podgląd';
      this.bottomPanel.appendChild(this.preview);
      var icon = document.createElement('i');
      icon.classList.add('far');
      icon.classList.add('fa-eye');
      this.preview.appendChild(icon);
      this.preview.addEventListener('click', this.throttle(this.toggleModal, this.time + 300));
      this.resetButton = document.createElement('button');
      this.resetButton.classList.add('reset-game');
      this.resetButton.type = 'button';
      this.resetButton.title = 'Zagraj od nowa';
      this.resetButton.textContent = 'Resetuj';
      this.bottomPanel.appendChild(this.resetButton);
      this.resetButton.addEventListener('click', this.throttle(this.resetGame, this.time + 150));
    };

    Puzzle.prototype.toggleEyeIconClass = function() {
      this.preview.firstElementChild.classList.toggle('fa-eye');
      this.preview.firstElementChild.classList.toggle('fa-eye-slash');
    };

    Puzzle.prototype.toggleModal = function() {
      this.toggleEyeIconClass();

      if (this.modal !== null) {
        this.removeModal();
        this.resetButton.disabled = false;
      } else {
        this.createModal();
        this.resetButton.disabled = true;
      }
    };

    Puzzle.prototype.removeModal = function() {
      var _this6 = this;

      this.modal.classList.remove('visible');
      setTimeout(function() {
        _this6.gameWrapper.removeChild(_this6.modal);

        _this6.modal = null;

        if (!_this6.isOver) {
          _this6.puzzleGame.addEventListener('keydown', _this6.handler);
        }

        _this6.puzzleGame.setAttribute('tabindex', '0');

        _this6.puzzleGame.focus();
      }, 50 + this.time);
    };

    Puzzle.prototype.createModal = function() {
      var _this7 = this;

      var top = this.puzzleGame.offsetTop;
      var left = this.puzzleGame.offsetLeft;
      var height = this.puzzleGame.offsetHeight;
      this.modal = document.createElement('div');
      this.modal.classList.add('preview-modal');
      this.modal.style.top = ''.concat(top, 'px');
      this.modal.style.left = ''.concat(left, 'px');
      this.modal.style.height = ''.concat(height, 'px');
      this.gameWrapper.appendChild(this.modal);
      var imagePreview = document.createElement('div');
      imagePreview.classList.add('image-preview');
      imagePreview.style.backgroundImage = 'url('.concat(this.image, ')');
      this.modal.appendChild(imagePreview);
      setTimeout(function() {
        _this7.modal.classList.add('visible');

        _this7.puzzleGame.removeEventListener('keydown', _this7.handler);

        _this7.puzzleGame.setAttribute('tabindex', '-1');
      }, 50);
    };

    Puzzle.prototype.resetGame = function() {
      this.gameWrapper.removeChild(this.puzzleGame);
      this.hiddenBlock = null;
      this.handler = null;
      this.time = null;
      this.blocks = [];
      this.count = 0;
      this.isOver = false;
      this.puzzleGame = null;
      this.countElement.textContent = 'Liczba ruch\xF3w: '.concat(this.count);
      this.createPuzzleGameElement();
      this.createBlocks();
      this.addBlocksToPuzzleGame();
      this.addEventsOnPuzzleGame();
    };

    Puzzle.prototype.createDescription = function() {
      this.description = document.createElement('div');
      this.description.classList.add('game-description');
      this.description.innerHTML =
        '\n      <p><span class="color">Jak gra\u0107:</span> kliknij na uk\u0142adank\u0119, je\u017Celi zmieni\u0105 si\u0119 kolory oznacza to, \u017Ce uk\u0142adanka jest aktywna. Naciskaj\u0105c strza\u0142ki na klawiaturze przesuwaj pusty klocek aby u\u0142o\u017Cy\u0107 obrazek.</p>\n      <p class="color">Wiedz, \u017Ce uk\u0142adank\u0119 nie zawsze mo\u017Cna u\u0142o\u017Cy\u0107 poniewa\u017C istnieje ryzyko wyst\u0105pienia w ostatnim rz\u0119dzie kolejno\u015Bci klock\xF3w 13-15-14 i dla takiego przypadku przestawienie klocka 15 z klockiem 14 jest niemo\u017Cliwe.</p>\n      ';
      this.wrapper.appendChild(this.description);
    };

    Puzzle.prototype.init = function() {
      this.createGameWrapper();
      this.createCounter();
      this.createPuzzleGameElement();
      this.createBlocks();
      this.addBlocksToPuzzleGame();
      this.addEventsOnPuzzleGame();
      this.createBottomPanel();
      this.createDescription();
      this.checkImageSize();
    };

    return Puzzle;
  })();

  var puzzle = new Puzzle({
    wrapper: document.querySelector('.puzzle'),
    image: '' // Here is your path to the image
  });
  puzzle.init();
})();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOlsiUHV6emxlIiwiY29uZmlnIiwiZGVmYXVsdENvbmZpZyIsIndyYXBwZXIiLCJkb2N1bWVudCIsImJvZHkiLCJpbWFnZSIsInRlc3RDb25maWciLCJTdG9yYWdlIiwic3RvcmFnZUtleSIsInNsaWNlIiwibGFzdEluZGV4T2YiLCJyZWNvcmRGcm9tTG9jYWxTdG9yYWdlIiwiSlNPTiIsInBhcnNlIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsImJvdHRvbVBhbmVsIiwicmVzZXRCdXR0b24iLCJwdXp6bGVHYW1lIiwiZ2FtZVdyYXBwZXIiLCJkZXNjcmlwdGlvbiIsInJlY29yZCIsInByZXZpZXciLCJoaWRkZW5CbG9jayIsImNvdW50RWxlbWVudCIsImhhbmRsZXIiLCJ0aW1lIiwibW9kYWwiLCJpc092ZXIiLCJibG9ja3MiLCJjb3VudCIsInByb3RvdHlwZSIsIk9iamVjdCIsIkVycm9yIiwiSFRNTERpdkVsZW1lbnQiLCJjaGVja0ltYWdlU2l6ZSIsImltZyIsIkltYWdlIiwic3JjIiwiYWRkRXZlbnRMaXN0ZW5lciIsImltZ0hlaWdodCIsIm5hdHVyYWxIZWlnaHQiLCJpbWdXaWR0aCIsIm5hdHVyYWxXaWR0aCIsImNyZWF0ZVdhcm5pbmciLCJjb21wbGV0ZSIsImV2ZW50IiwiRXZlbnQiLCJkaXNwYXRjaEV2ZW50Iiwic2l6ZSIsIndhcm5pbmciLCJjcmVhdGVFbGVtZW50IiwiY2xhc3NMaXN0IiwiYWRkIiwidGV4dENvbnRlbnQiLCJhcHBlbmRDaGlsZCIsImNyZWF0ZUdhbWVXcmFwcGVyIiwiY3JlYXRlQ291bnRlciIsImNyZWF0ZVB1enpsZUdhbWVFbGVtZW50Iiwic2V0QXR0cmlidXRlIiwiaW5zZXJ0QmVmb3JlIiwiYXJyYXlTaHVmZmxlIiwiYXJyIiwieCIsImoiLCJpIiwibGVuZ3RoIiwiTWF0aCIsImZsb29yIiwicmFuZG9tIiwiY3JlYXRlQmxvY2tzIiwiYmxvY2siLCJzdHlsZSIsImJhY2tncm91bmRJbWFnZSIsInB1c2giLCJmb3JFYWNoIiwiaW5kZXgiLCJjcmVhdGVIaWRkZW5CbG9jayIsImFkZEJsb2Nrc1RvUHV6emxlR2FtZSIsInBhcnNlRmxvYXQiLCJnZXRDb21wdXRlZFN0eWxlIiwidHJhbnNpdGlvbkR1cmF0aW9uIiwiYWRkRXZlbnRzT25QdXp6bGVHYW1lIiwidGhyb3R0bGUiLCJjaGVja1doYXRLZXlJc1ByZXNzIiwicGFyZW50RWxlbWVudCIsInJlbW92ZSIsImNhbGxiYWNrIiwid2FpdCIsImUiLCJjYWxsIiwic2V0VGltZW91dCIsImlzR2FtZU92ZXIiLCJlbmQiLCJzZXRJbkxvY2FsU3RvcmFnZSIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJrZXkiLCJrZXlDb2RlIiwidGFyZ2V0IiwiZm9jdXMiLCJjaGFuZ2VEaXJlY3Rpb24iLCJwb3NpdGlvbiIsImluZGV4T2YiLCJjaGFuZ2VQdXp6bGVCbG9jayIsImNoZWNrT3JkZXIiLCJpbmNyZWFzZUNvdW50IiwiY2hhbmdlUG9zaXRpb25JbkFycmF5IiwiaGlkZGVuRWwiLCJzaWJsaW5nRWwiLCJ0ZW1wIiwic3BsaWNlIiwiaGlkZGVuIiwic2libGluZyIsImhpZGRlbkVsZW1lbnRDbGFzc05hbWUiLCJwYXJzZUludCIsInNpYmxpbmdFbGVtZW50Q2xhc3NOYW1lIiwiY3VycmVudE9yZGVyIiwiZmlsdGVyIiwiY2xhc3NOYW1lIiwic3Vic3RyIiwic2NvcmUiLCJzZXRJdGVtIiwic3RyaW5naWZ5IiwiY3JlYXRlQm90dG9tUGFuZWwiLCJOdW1iZXIiLCJ0eXBlIiwidGl0bGUiLCJpY29uIiwidG9nZ2xlTW9kYWwiLCJyZXNldEdhbWUiLCJ0b2dnbGVFeWVJY29uQ2xhc3MiLCJmaXJzdEVsZW1lbnRDaGlsZCIsInRvZ2dsZSIsInJlbW92ZU1vZGFsIiwiZGlzYWJsZWQiLCJjcmVhdGVNb2RhbCIsInJlbW92ZUNoaWxkIiwidG9wIiwib2Zmc2V0VG9wIiwibGVmdCIsIm9mZnNldExlZnQiLCJoZWlnaHQiLCJvZmZzZXRIZWlnaHQiLCJpbWFnZVByZXZpZXciLCJjcmVhdGVEZXNjcmlwdGlvbiIsImlubmVySFRNTCIsImluaXQiLCJwdXp6bGUiLCJxdWVyeVNlbGVjdG9yIl0sIm1hcHBpbmdzIjoiOztBQUFBLENBQUMsWUFBTTtBQUNMLE1BQU1BLE1BQU0sR0FBSSxZQUFNO0FBQ3BCLGFBQVNBLE1BQVQsQ0FBZ0JDLE1BQWhCLEVBQXdCO0FBQ3RCLFVBQUksRUFBRSxnQkFBZ0JELE1BQWxCLENBQUosRUFBK0I7QUFDN0IsZUFBTyxJQUFJQSxNQUFKLENBQVdDLE1BQVgsQ0FBUDtBQUNELE9BRkQsTUFFTztBQUNMLFlBQU1DLGFBQWEsR0FBRztBQUNwQkMsVUFBQUEsT0FBTyxFQUFFQyxRQUFRLENBQUNDLElBREU7QUFFcEJDLFVBQUFBLEtBQUssRUFBRTtBQUZhLFNBQXRCO0FBS0EsYUFBS0MsVUFBTCxDQUFnQk4sTUFBaEI7QUFDQSxhQUFLRSxPQUFMLEdBQWVGLE1BQU0sQ0FBQ0UsT0FBUCxJQUFrQkQsYUFBYSxDQUFDQyxPQUEvQztBQUNBLGFBQUtHLEtBQUwsR0FBYUwsTUFBTSxDQUFDSyxLQUFQLElBQWdCSixhQUFhLENBQUNJLEtBQTNDOztBQUNBLFlBQUksT0FBT0UsT0FBUCxLQUFtQixXQUF2QixFQUFvQztBQUNsQyxlQUFLQyxVQUFMLEdBQWtCLEtBQUtILEtBQUwsQ0FBV0ksS0FBWCxDQUFpQixLQUFLSixLQUFMLENBQVdLLFdBQVgsQ0FBdUIsR0FBdkIsSUFBOEIsQ0FBL0MsRUFBa0QsS0FBS0wsS0FBTCxDQUFXSyxXQUFYLENBQXVCLEdBQXZCLENBQWxELENBQWxCO0FBQ0EsZUFBS0Msc0JBQUwsR0FBOEJDLElBQUksQ0FBQ0MsS0FBTCxDQUFXQyxZQUFZLENBQUNDLE9BQWIsQ0FBcUIsS0FBS1AsVUFBMUIsQ0FBWCxJQUMxQkksSUFBSSxDQUFDQyxLQUFMLENBQVdDLFlBQVksQ0FBQ0MsT0FBYixDQUFxQixLQUFLUCxVQUExQixDQUFYLENBRDBCLEdBRTFCLElBRko7QUFHRDs7QUFDRCxhQUFLUSxXQUFMLEdBQW1CLElBQW5C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a0QsS0FBS3hCLEtBQXZEO0FBRUEsV0FBSzRCLHVCQUFMO0FBQ0EsV0FBS1ksWUFBTDtBQUNBLFdBQUtRLHFCQUFMO0FBQ0EsV0FBS0kscUJBQUw7QUFDRCxLQWhCRDs7QUFrQkFuRixJQUFBQSxNQUFNLENBQUNnQyxTQUFQLENBQWlCaUgsaUJBQWpCLEdBQXFDLFlBQVc7QUFDOUMsV0FBSzVILFdBQUwsR0FBbUJqQixRQUFRLENBQUNnRCxhQUFULENBQXVCLEtBQXZCLENBQW5CO0FBQ0EsV0FBSy9CLFdBQUwsQ0FBaUJnQyxTQUFqQixDQUEyQkMsR0FBM0IsQ0FBK0Isa0JBQS9CO0FBQ0EsV0FBS2pDLFdBQUwsQ0FBaUI2SCxTQUFqQjtBQUlBLFdBQUsvSSxPQUFMLENBQWFxRCxXQUFiLENBQXlCLEtBQUtuQyxXQUE5QjtBQUNELEtBUkQ7O0FBVUFyQixJQUFBQSxNQUFNLENBQUNnQyxTQUFQLENBQWlCbUgsSUFBakIsR0FBd0IsWUFBVztBQUNqQyxXQUFLMUYsaUJBQUw7QUFDQSxXQUFLQyxhQUFMO0FBQ0EsV0FBS0MsdUJBQUw7QUFDQSxXQUFLWSxZQUFMO0FBQ0EsV0FBS1EscUJBQUw7QUFDQSxXQUFLSSxxQkFBTDtBQUNBLFdBQUt5QyxpQkFBTDtBQUNBLFdBQUtxQixpQkFBTDtBQUNBLFdBQUs3RyxjQUFMO0FBQ0QsS0FWRDs7QUFZQSxXQUFPcEMsTUFBUDtBQUNELEdBamJjLEVBQWY7O0FBbWJBLE1BQU1vSixNQUFNLEdBQUcsSUFBSXBKLE1BQUosQ0FBVztBQUN4QkcsSUFBQUEsT0FBTyxFQUFFQyxRQUFRLENBQUNpSixhQUFULENBQXVCLFNBQXZCLENBRGU7QUFFeEIvSSxJQUFBQSxLQUFLLEVBQUUsRUFGaUIsQ0FFZDs7QUFGYyxHQUFYLENBQWY7QUFLQThJLEVBQUFBLE1BQU0sQ0FBQ0QsSUFBUDtBQUNELENBMWJEIiwic291cmNlc0NvbnRlbnQiOlsiKCgpID0+IHtcclxuICBjb25zdCBQdXp6bGUgPSAoKCkgPT4ge1xyXG4gICAgZnVuY3Rpb24gUHV6emxlKGNvbmZpZykge1xyXG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUHV6emxlKSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHV6emxlKGNvbmZpZyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc3QgZGVmYXVsdENvbmZpZyA9IHtcclxuICAgICAgICAgIHdyYXBwZXI6IGRvY3VtZW50LmJvZHksXHJcbiAgICAgICAgICBpbWFnZTogJydcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLnRlc3RDb25maWcoY29uZmlnKTtcclxuICAgICAgICB0aGlzLndyYXBwZXIgPSBjb25maWcud3JhcHBlciB8fCBkZWZhdWx0Q29uZmlnLndyYXBwZXI7XHJcbiAgICAgICAgdGhpcy5pbWFnZSA9IGNvbmZpZy5pbWFnZSB8fCBkZWZhdWx0Q29uZmlnLmltYWdlO1xyXG4gICAgICAgIGlmICh0eXBlb2YgU3RvcmFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgIHRoaXMuc3RvcmFnZUtleSA9IHRoaXMuaW1hZ2Uuc2xpY2UodGhpcy5pbWFnZS5sYXN0SW5kZXhPZignLycpICsgMSwgdGhpcy5pbWFnZS5sYXN0SW5kZXhPZignLicpKTtcclxuICAgICAgICAgIHRoaXMucmVjb3JkRnJvbUxvY2FsU3RvcmFnZSA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5zdG9yYWdlS2V5KSlcclxuICAgICAgICAgICAgPyBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMuc3RvcmFnZUtleSkpXHJcbiAgICAgICAgICAgIDogbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5ib3R0b21QYW5lbCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5yZXNldEJ1dHRvbiA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5wdXp6bGVHYW1lID0gbnVsbDtcclxuICAgICAgICB0aGlzLmdhbWVXcmFwcGVyID0gbnVsbDtcclxuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uID0gbnVsbDtcclxuICAgICAgICB0aGlzLnJlY29yZCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5wcmV2aWV3ID0gbnVsbDtcclxuICAgICAgICB0aGlzLmhpZGRlbkJsb2NrID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNvdW50RWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5oYW5kbGVyID0gbnVsbDtcclxuICAgICAgICB0aGlzLnRpbWUgPSBudWxsO1xyXG4gICAgICAgIHRoaXMubW9kYWwgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuaXNPdmVyID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5ibG9ja3MgPSBbXTtcclxuICAgICAgICB0aGlzLmNvdW50ID0gMDtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIFB1enpsZS5wcm90b3R5cGUudGVzdENvbmZpZyA9IGZ1bmN0aW9uKGNvbmZpZykge1xyXG4gICAgICBpZiAoIShjb25maWcgaW5zdGFuY2VvZiBPYmplY3QpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBcmd1bWVudCBtdXN0IGJlIG9iamVjdCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoIShjb25maWcud3JhcHBlciBpbnN0YW5jZW9mIEhUTUxEaXZFbGVtZW50KSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignV3JhcHBlciBtdXN0IGJlIGRpdiBlbGVtZW50Jyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICghKHR5cGVvZiBjb25maWcuaW1hZ2UgPT09ICdzdHJpbmcnKSB8fCBjb25maWcuaW1hZ2UgPT09ICcnKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbWFnZSBtdXN0IGJlIHR5cGUgb2Ygc3RyaW5nIGFuZCBjYW4ndCBiZSBlbXB0eWApO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIFB1enpsZS5wcm90b3R5cGUuY2hlY2tJbWFnZVNpemUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgY29uc3QgaW1nID0gbmV3IEltYWdlKCk7XHJcblxyXG4gICAgICBpbWcuc3JjID0gdGhpcy5pbWFnZTtcclxuXHJcbiAgICAgIGltZy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGltZ0hlaWdodCA9IGltZy5uYXR1cmFsSGVpZ2h0O1xyXG4gICAgICAgIGNvbnN0IGltZ1dpZHRoID0gaW1nLm5hdHVyYWxXaWR0aDtcclxuICAgICAgICBpZiAoaW1nSGVpZ2h0ID4gNTAwIHx8IGltZ1dpZHRoID4gNTAwKSB7XHJcbiAgICAgICAgICB0aGlzLmNyZWF0ZVdhcm5pbmcoJ2R1xbx5Jyk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChpbWdIZWlnaHQgPCA0MDAgfHwgaW1nV2lkdGggPCA0MDApIHtcclxuICAgICAgICAgIHRoaXMuY3JlYXRlV2FybmluZygnbWHFgnknKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgaWYgKGltZy5jb21wbGV0ZSkge1xyXG4gICAgICAgIGNvbnN0IGV2ZW50ID0gbmV3IEV2ZW50KCdsb2FkJyk7XHJcbiAgICAgICAgaW1nLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIFB1enpsZS5wcm90b3R5cGUuY3JlYXRlV2FybmluZyA9IGZ1bmN0aW9uKHNpemUpIHtcclxuICAgICAgY29uc3Qgd2FybmluZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICB3YXJuaW5nLmNsYXNzTGlzdC5hZGQoJ2JpZy1pbWctZXJyb3InKTtcclxuICAgICAgd2FybmluZy50ZXh0Q29udGVudCA9IGBUd8OzaiBvYnJhemVrIGplc3QgemEgJHtzaXplfS4gV3ltaWFyeSBvYnJhemthIHBvd2lubnkgd3lub3NpxIcgNDAwcHggeCA0MDBweC4gTW9nxIUgd3lzdMSZcG93YcSHIHByb2JsZW15IHogZHppYcWCYW5pZW0gcHJvZ3JhbXUuYDtcclxuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh3YXJuaW5nKTtcclxuICAgIH07XHJcblxyXG4gICAgUHV6emxlLnByb3RvdHlwZS5jcmVhdGVHYW1lV3JhcHBlciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGlzLmdhbWVXcmFwcGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgIHRoaXMuZ2FtZVdyYXBwZXIuY2xhc3NMaXN0LmFkZCgnZ2FtZS13cmFwcGVyJyk7XHJcbiAgICAgIHRoaXMud3JhcHBlci5hcHBlbmRDaGlsZCh0aGlzLmdhbWVXcmFwcGVyKTtcclxuICAgIH07XHJcblxyXG4gICAgUHV6emxlLnByb3RvdHlwZS5jcmVhdGVDb3VudGVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgIHRoaXMuY291bnRFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gICAgICB0aGlzLmNvdW50RWxlbWVudC5jbGFzc0xpc3QuYWRkKCdwdXp6bGUtYXR0ZW1wdC1jb3VudGVyJyk7XHJcbiAgICAgIHRoaXMuY291bnRFbGVtZW50LnRleHRDb250ZW50ID0gYExpY3piYSBydWNow7N3OiAke3RoaXMuY291bnR9YDtcclxuICAgICAgdGhpcy5nYW1lV3JhcHBlci5hcHBlbmRDaGlsZCh0aGlzLmNvdW50RWxlbWVudCk7XHJcbiAgICB9O1xyXG5cclxuICAgIFB1enpsZS5wcm90b3R5cGUuY3JlYXRlUHV6emxlR2FtZUVsZW1lbnQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgdGhpcy5wdXp6bGVHYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgIHRoaXMucHV6emxlR2FtZS5jbGFzc0xpc3QuYWRkKCdwdXp6bGUtZ2FtZScpO1xyXG4gICAgICB0aGlzLnB1enpsZUdhbWUuc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsICcwJyk7XHJcbiAgICAgIGlmICh0aGlzLnJlc2V0QnV0dG9uKSB7XHJcbiAgICAgICAgdGhpcy5nYW1lV3JhcHBlci5pbnNlcnRCZWZvcmUodGhpcy5wdXp6bGVHYW1lLCB0aGlzLmJvdHRvbVBhbmVsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmdhbWVXcmFwcGVyLmFwcGVuZENoaWxkKHRoaXMucHV6emxlR2FtZSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgUHV6emxlLnByb3RvdHlwZS5hcnJheVNodWZmbGUgPSBmdW5jdGlvbihhcnIpIHtcclxuICAgICAgbGV0IHggPSBudWxsO1xyXG4gICAgICBsZXQgaiA9IG51bGw7XHJcblxyXG4gICAgICBmb3IgKGxldCBpID0gYXJyLmxlbmd0aCAtIDE7IGkgPiAwOyBpLS0pIHtcclxuICAgICAgICBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKGkgKyAxKSk7XHJcbiAgICAgICAgeCA9IGFycltpXTtcclxuICAgICAgICBhcnJbaV0gPSBhcnJbal07XHJcbiAgICAgICAgYXJyW2pdID0geDtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIGFycjtcclxuICAgIH07XHJcblxyXG4gICAgUHV6emxlLnByb3RvdHlwZS5jcmVhdGVCbG9ja3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gMTU7IGkrKykge1xyXG4gICAgICAgIGNvbnN0IGJsb2NrID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgYmxvY2suY2xhc3NMaXN0LmFkZChgcHV6emxlYCk7XHJcbiAgICAgICAgYmxvY2suY2xhc3NMaXN0LmFkZChgaW1nLSR7aSA8IDEwID8gJzAnICsgaSA6IGl9YCk7XHJcbiAgICAgICAgYmxvY2suc3R5bGUuYmFja2dyb3VuZEltYWdlID0gYHVybCgke3RoaXMuaW1hZ2V9KWA7XHJcblxyXG4gICAgICAgIHRoaXMuYmxvY2tzLnB1c2goYmxvY2spO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmJsb2NrcyA9IHRoaXMuYXJyYXlTaHVmZmxlKHRoaXMuYmxvY2tzKTtcclxuICAgICAgdGhpcy5ibG9ja3MuZm9yRWFjaCgoYmxvY2ssIGluZGV4KSA9PiB7XHJcbiAgICAgICAgYmxvY2suY2xhc3NMaXN0LmFkZChgcHV6emxlLSR7aW5kZXggKyAxIDwgMTAgPyAnMCcgKyAoaW5kZXggKyAxKSA6IGluZGV4ICsgMX1gKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICB0aGlzLmJsb2Nrcy5wdXNoKHRoaXMuY3JlYXRlSGlkZGVuQmxvY2soKSk7XHJcbiAgICB9O1xyXG5cclxuICAgIFB1enpsZS5wcm90b3R5cGUuY3JlYXRlSGlkZGVuQmxvY2sgPSBmdW5jdGlvbigpIHtcclxuICAgICAgLy8gdGhpcy5oaWRkZW5CbG9jayBpcyBsYXN0IGVsZW1lbnQgaW4gcHV6emxlXHJcbiAgICAgIHRoaXMuaGlkZGVuQmxvY2sgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgdGhpcy5oaWRkZW5CbG9jay5jbGFzc0xpc3QuYWRkKGBwdXp6bGVgKTtcclxuICAgICAgdGhpcy5oaWRkZW5CbG9jay5jbGFzc0xpc3QuYWRkKGBpbWctMTZgKTtcclxuICAgICAgdGhpcy5oaWRkZW5CbG9jay5jbGFzc0xpc3QuYWRkKCdwdXp6bGUtMTYnKTtcclxuICAgICAgdGhpcy5oaWRkZW5CbG9jay5jbGFzc0xpc3QuYWRkKCdoaWRlJyk7XHJcbiAgICAgIHRoaXMuaGlkZGVuQmxvY2suc3R5bGUuYmFja2dyb3VuZEltYWdlID0gYHVybCgke3RoaXMuaW1hZ2V9KWA7XHJcbiAgICAgIHJldHVybiB0aGlzLmhpZGRlbkJsb2NrO1xyXG4gICAgfTtcclxuXHJcbiAgICBQdXp6bGUucHJvdG90eXBlLmFkZEJsb2Nrc1RvUHV6emxlR2FtZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGlzLmJsb2Nrcy5mb3JFYWNoKGJsb2NrID0+IHtcclxuICAgICAgICB0aGlzLnB1enpsZUdhbWUuYXBwZW5kQ2hpbGQoYmxvY2spO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHRoaXMudGltZSA9IHBhcnNlRmxvYXQoZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmhpZGRlbkJsb2NrKS50cmFuc2l0aW9uRHVyYXRpb24pICogMTAwMDtcclxuICAgIH07XHJcblxyXG4gICAgUHV6emxlLnByb3RvdHlwZS5hZGRFdmVudHNPblB1enpsZUdhbWUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgdGhpcy5oYW5kbGVyID0gdGhpcy50aHJvdHRsZSh0aGlzLmNoZWNrV2hhdEtleUlzUHJlc3MsIHRoaXMudGltZSk7XHJcbiAgICAgIHRoaXMucHV6emxlR2FtZS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdGhpcy5oYW5kbGVyKTtcclxuICAgICAgdGhpcy5wdXp6bGVHYW1lLmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgKCkgPT4gdGhpcy5wdXp6bGVHYW1lLnBhcmVudEVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnaXMtZm9jdXNlZCcpKTtcclxuICAgICAgdGhpcy5wdXp6bGVHYW1lLmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCAoKSA9PiB0aGlzLnB1enpsZUdhbWUucGFyZW50RWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdpcy1mb2N1c2VkJykpO1xyXG4gICAgfTtcclxuXHJcbiAgICBQdXp6bGUucHJvdG90eXBlLnRocm90dGxlID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRpbWUpIHtcclxuICAgICAgbGV0IHdhaXQgPSBmYWxzZTtcclxuICAgICAgcmV0dXJuIGUgPT4ge1xyXG4gICAgICAgIGlmICghd2FpdCkge1xyXG4gICAgICAgICAgd2FpdCA9IHRydWU7XHJcbiAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXMsIGUpO1xyXG4gICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgIHdhaXQgPSBmYWxzZTtcclxuICAgICAgICAgIH0sIHRpbWUgLSAxNTApO1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuICAgIH07XHJcblxyXG4gICAgUHV6emxlLnByb3RvdHlwZS5pc0dhbWVPdmVyID0gZnVuY3Rpb24oZW5kKSB7XHJcbiAgICAgIGlmIChlbmQpIHtcclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgIHRoaXMuY291bnRFbGVtZW50LnRleHRDb250ZW50ID0gYEdyYXR1bGFjamUgLSBUd8OzaiB3eW5payB0byAke3RoaXMuY291bnR9YDtcclxuICAgICAgICAgIHRoaXMuaGlkZGVuQmxvY2suY2xhc3NMaXN0LnJlbW92ZSgnaGlkZScpO1xyXG4gICAgICAgICAgdGhpcy5zZXRJbkxvY2FsU3RvcmFnZSh0aGlzLmNvdW50KTtcclxuICAgICAgICAgIHRoaXMuaXNPdmVyID0gdHJ1ZTtcclxuICAgICAgICB9LCB0aGlzLnRpbWUpO1xyXG5cclxuICAgICAgICB0aGlzLnB1enpsZUdhbWUucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMuaGFuZGxlcik7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgUHV6emxlLnByb3RvdHlwZS5jaGVja1doYXRLZXlJc1ByZXNzID0gZnVuY3Rpb24oZSkge1xyXG4gICAgICBjb25zdCBrZXkgPSBlLmtleUNvZGU7XHJcblxyXG4gICAgICAvLyBGb3IgSUUgYmVjYXVzZSBlLnRhcmdldCBzaG91bGQgYmUgLnB1enpsZS13cmFwcGVyIGJ1dCBpcyAucHV6emxlXHJcbiAgICAgIGlmIChlLnRhcmdldCAhPT0gdGhpcy5wdXp6bGVHYW1lKSB7XHJcbiAgICAgICAgdGhpcy5wdXp6bGVHYW1lLmZvY3VzKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuaXNHYW1lT3Zlcih0aGlzLmNoYW5nZURpcmVjdGlvbihrZXkpKTtcclxuICAgIH07XHJcblxyXG4gICAgUHV6emxlLnByb3RvdHlwZS5jaGFuZ2VEaXJlY3Rpb24gPSBmdW5jdGlvbihrZXkpIHtcclxuICAgICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLmJsb2Nrcy5pbmRleE9mKHRoaXMuaGlkZGVuQmxvY2spO1xyXG5cclxuICAgICAgaWYgKGtleSA9PT0gMzcpIHtcclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICB0eXBlb2YgdGhpcy5ibG9ja3NbcG9zaXRpb24gLSAxXSAhPT0gJ3VuZGVmaW5lZCcgJiZcclxuICAgICAgICAgIHBvc2l0aW9uIC0gMSAhPT0gMTEgJiZcclxuICAgICAgICAgIHBvc2l0aW9uIC0gMSAhPT0gNyAmJlxyXG4gICAgICAgICAgcG9zaXRpb24gLSAxICE9PSAzXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICB0aGlzLmNoYW5nZVB1enpsZUJsb2NrKHBvc2l0aW9uLCBwb3NpdGlvbiAtIDEpO1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuY2hlY2tPcmRlcigpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2UgaWYgKGtleSA9PT0gMzgpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuYmxvY2tzW3Bvc2l0aW9uIC0gNF0gIT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgICB0aGlzLmNoYW5nZVB1enpsZUJsb2NrKHBvc2l0aW9uLCBwb3NpdGlvbiAtIDQpO1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuY2hlY2tPcmRlcigpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2UgaWYgKGtleSA9PT0gMzkpIHtcclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICB0eXBlb2YgdGhpcy5ibG9ja3NbcG9zaXRpb24gKyAxXSAhPT0gJ3VuZGVmaW5lZCcgJiZcclxuICAgICAgICAgIHBvc2l0aW9uICsgMSAhPT0gMTIgJiZcclxuICAgICAgICAgIHBvc2l0aW9uICsgMSAhPT0gOCAmJlxyXG4gICAgICAgICAgcG9zaXRpb24gKyAxICE9PSA0XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICB0aGlzLmNoYW5nZVB1enpsZUJsb2NrKHBvc2l0aW9uLCBwb3NpdGlvbiArIDEpO1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuY2hlY2tPcmRlcigpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2UgaWYgKGtleSA9PT0gNDApIHtcclxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuYmxvY2tzW3Bvc2l0aW9uICsgNF0gIT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgICB0aGlzLmNoYW5nZVB1enpsZUJsb2NrKHBvc2l0aW9uLCBwb3NpdGlvbiArIDQpO1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuY2hlY2tPcmRlcigpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIFB1enpsZS5wcm90b3R5cGUuaW5jcmVhc2VDb3VudCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGlzLmNvdW50Kys7XHJcbiAgICAgIHRoaXMuY291bnRFbGVtZW50LnRleHRDb250ZW50ID0gYExpY3piYSBydWNow7N3OiAke3RoaXMuY291bnR9YDtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9O1xyXG5cclxuICAgIFB1enpsZS5wcm90b3R5cGUuY2hhbmdlUG9zaXRpb25JbkFycmF5ID0gZnVuY3Rpb24oaGlkZGVuRWwsIHNpYmxpbmdFbCkge1xyXG4gICAgICBjb25zdCB0ZW1wID0gdGhpcy5ibG9ja3Nbc2libGluZ0VsXTtcclxuXHJcbiAgICAgIC8vIFN3YXAgaGlkZGVuRWwgd2l0aCBzaWJsaW5nRWwgaW4gYXJyYXlcclxuICAgICAgdGhpcy5ibG9ja3Muc3BsaWNlKHNpYmxpbmdFbCwgMSwgdGhpcy5ibG9ja3NbaGlkZGVuRWxdKTtcclxuICAgICAgdGhpcy5ibG9ja3Muc3BsaWNlKGhpZGRlbkVsLCAxLCB0ZW1wKTtcclxuICAgICAgcmV0dXJuIHRoaXMuaW5jcmVhc2VDb3VudCgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBQdXp6bGUucHJvdG90eXBlLmNoYW5nZVB1enpsZUJsb2NrID0gZnVuY3Rpb24oaGlkZGVuLCBzaWJsaW5nKSB7XHJcbiAgICAgIGNvbnN0IGhpZGRlbkVsZW1lbnRDbGFzc05hbWUgPSBgcHV6emxlLSR7XHJcbiAgICAgICAgcGFyc2VJbnQoaGlkZGVuKSArIDEgPCAxMCA/ICcwJyArIChwYXJzZUludChoaWRkZW4pICsgMSkgOiBwYXJzZUludChoaWRkZW4pICsgMVxyXG4gICAgICB9YDtcclxuICAgICAgY29uc3Qgc2libGluZ0VsZW1lbnRDbGFzc05hbWUgPSBgcHV6emxlLSR7XHJcbiAgICAgICAgcGFyc2VJbnQoc2libGluZykgKyAxIDwgMTAgPyAnMCcgKyAocGFyc2VJbnQoc2libGluZykgKyAxKSA6IHBhcnNlSW50KHNpYmxpbmcpICsgMVxyXG4gICAgICB9YDtcclxuXHJcbiAgICAgIHRoaXMuYmxvY2tzW2hpZGRlbl0uY2xhc3NMaXN0LnJlbW92ZShoaWRkZW5FbGVtZW50Q2xhc3NOYW1lKTtcclxuICAgICAgdGhpcy5ibG9ja3NbaGlkZGVuXS5jbGFzc0xpc3QuYWRkKHNpYmxpbmdFbGVtZW50Q2xhc3NOYW1lKTtcclxuICAgICAgdGhpcy5ibG9ja3Nbc2libGluZ10uY2xhc3NMaXN0LnJlbW92ZShzaWJsaW5nRWxlbWVudENsYXNzTmFtZSk7XHJcbiAgICAgIHRoaXMuYmxvY2tzW3NpYmxpbmddLmNsYXNzTGlzdC5hZGQoaGlkZGVuRWxlbWVudENsYXNzTmFtZSk7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5jaGFuZ2VQb3NpdGlvbkluQXJyYXkoaGlkZGVuLCBzaWJsaW5nKTtcclxuICAgIH07XHJcblxyXG4gICAgUHV6emxlLnByb3RvdHlwZS5jaGVja09yZGVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgIC8vIFRoaXMgZnVuY3Rpb24gY2hlY2sgaWYgZ2FtZSBzaG91bGQgYmUgb3ZlclxyXG4gICAgICBjb25zdCBjdXJyZW50T3JkZXIgPSB0aGlzLmJsb2Nrcy5maWx0ZXIoYmxvY2sgPT4ge1xyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICBibG9jay5jbGFzc05hbWUuc3Vic3RyKGJsb2NrLmNsYXNzTmFtZS5pbmRleE9mKCdpbWctJykgKyBgaW1nLWAubGVuZ3RoLCAyKSA9PT1cclxuICAgICAgICAgIGJsb2NrLmNsYXNzTmFtZS5zdWJzdHIoYmxvY2suY2xhc3NOYW1lLmluZGV4T2YoJ3B1enpsZS0nKSArIGBwdXp6bGUtYC5sZW5ndGgsIDIpXHJcbiAgICAgICAgKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBpZiAoY3VycmVudE9yZGVyLmxlbmd0aCA9PT0gdGhpcy5ibG9ja3MubGVuZ3RoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIFB1enpsZS5wcm90b3R5cGUuc2V0SW5Mb2NhbFN0b3JhZ2UgPSBmdW5jdGlvbihzY29yZSkge1xyXG4gICAgICBpZiAodHlwZW9mIFN0b3JhZ2UgIT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgaWYgKHRoaXMucmVjb3JkRnJvbUxvY2FsU3RvcmFnZSA9PT0gbnVsbCB8fCBzY29yZSA8IHBhcnNlSW50KHRoaXMucmVjb3JkRnJvbUxvY2FsU3RvcmFnZSkpIHtcclxuICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKHRoaXMuc3RvcmFnZUtleSwgSlNPTi5zdHJpbmdpZnkoc2NvcmUpKTtcclxuICAgICAgICAgIHRoaXMucmVjb3JkLnRleHRDb250ZW50ID0gYFR3w7NqIG9iZWNueSByZWtvcmQ6ICR7c2NvcmV9YDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgUHV6emxlLnByb3RvdHlwZS5jcmVhdGVCb3R0b21QYW5lbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGlzLmJvdHRvbVBhbmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgIHRoaXMuYm90dG9tUGFuZWwuY2xhc3NMaXN0LmFkZCgncHV6emxlLWJvdHRvbS1wYW5lbCcpO1xyXG4gICAgICB0aGlzLmdhbWVXcmFwcGVyLmFwcGVuZENoaWxkKHRoaXMuYm90dG9tUGFuZWwpO1xyXG5cclxuICAgICAgaWYgKHR5cGVvZiBTdG9yYWdlICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgICAgIHRoaXMucmVjb3JkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gICAgICAgIHRoaXMucmVjb3JkLmNsYXNzTGlzdC5hZGQoJ3B1enpsZS1yZWNvcmQnKTtcclxuICAgICAgICBpZiAodGhpcy5yZWNvcmRGcm9tTG9jYWxTdG9yYWdlID09PSBudWxsKSB7XHJcbiAgICAgICAgICB0aGlzLnJlY29yZC50ZXh0Q29udGVudCA9IGBCcmFrIHJla29yZHVgO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLnJlY29yZC50ZXh0Q29udGVudCA9IGBUd8OzaiBvYmVjbnkgcmVrb3JkOiAke051bWJlcih0aGlzLnJlY29yZEZyb21Mb2NhbFN0b3JhZ2UpfWA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuYm90dG9tUGFuZWwuYXBwZW5kQ2hpbGQodGhpcy5yZWNvcmQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnByZXZpZXcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcclxuICAgICAgdGhpcy5wcmV2aWV3LmNsYXNzTGlzdC5hZGQoJ3B1enpsZS1wcmV2aWV3Jyk7XHJcbiAgICAgIHRoaXMucHJldmlldy50eXBlID0gJ2J1dHRvbic7XHJcbiAgICAgIHRoaXMucHJldmlldy50aXRsZSA9ICdOYWNpxZtuaWogbGV3eSBwcnp5Y2lzayBteXN6eSBhYnkgem9iYWN6ecSHIHBvZGdsxIVkJztcclxuICAgICAgdGhpcy5ib3R0b21QYW5lbC5hcHBlbmRDaGlsZCh0aGlzLnByZXZpZXcpO1xyXG5cclxuICAgICAgY29uc3QgaWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcclxuICAgICAgaWNvbi5jbGFzc0xpc3QuYWRkKCdmYXInKTtcclxuICAgICAgaWNvbi5jbGFzc0xpc3QuYWRkKCdmYS1leWUnKTtcclxuICAgICAgdGhpcy5wcmV2aWV3LmFwcGVuZENoaWxkKGljb24pO1xyXG5cclxuICAgICAgdGhpcy5wcmV2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy50aHJvdHRsZSh0aGlzLnRvZ2dsZU1vZGFsLCB0aGlzLnRpbWUgKyAzMDApKTtcclxuXHJcbiAgICAgIHRoaXMucmVzZXRCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcclxuICAgICAgdGhpcy5yZXNldEJ1dHRvbi5jbGFzc0xpc3QuYWRkKCdyZXNldC1nYW1lJyk7XHJcbiAgICAgIHRoaXMucmVzZXRCdXR0b24udHlwZSA9ICdidXR0b24nO1xyXG4gICAgICB0aGlzLnJlc2V0QnV0dG9uLnRpdGxlID0gJ1phZ3JhaiBvZCBub3dhJztcclxuICAgICAgdGhpcy5yZXNldEJ1dHRvbi50ZXh0Q29udGVudCA9ICdSZXNldHVqJztcclxuICAgICAgdGhpcy5ib3R0b21QYW5lbC5hcHBlbmRDaGlsZCh0aGlzLnJlc2V0QnV0dG9uKTtcclxuXHJcbiAgICAgIHRoaXMucmVzZXRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLnRocm90dGxlKHRoaXMucmVzZXRHYW1lLCB0aGlzLnRpbWUgKyAxNTApKTtcclxuICAgIH07XHJcblxyXG4gICAgUHV6emxlLnByb3RvdHlwZS50b2dnbGVFeWVJY29uQ2xhc3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgdGhpcy5wcmV2aWV3LmZpcnN0RWxlbWVudENoaWxkLmNsYXNzTGlzdC50b2dnbGUoJ2ZhLWV5ZScpO1xyXG4gICAgICB0aGlzLnByZXZpZXcuZmlyc3RFbGVtZW50Q2hpbGQuY2xhc3NMaXN0LnRvZ2dsZSgnZmEtZXllLXNsYXNoJyk7XHJcbiAgICB9O1xyXG5cclxuICAgIFB1enpsZS5wcm90b3R5cGUudG9nZ2xlTW9kYWwgPSBmdW5jdGlvbigpIHtcclxuICAgICAgdGhpcy50b2dnbGVFeWVJY29uQ2xhc3MoKTtcclxuXHJcbiAgICAgIGlmICh0aGlzLm1vZGFsICE9PSBudWxsKSB7XHJcbiAgICAgICAgdGhpcy5yZW1vdmVNb2RhbCgpO1xyXG4gICAgICAgIHRoaXMucmVzZXRCdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmNyZWF0ZU1vZGFsKCk7XHJcbiAgICAgICAgdGhpcy5yZXNldEJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgUHV6emxlLnByb3RvdHlwZS5yZW1vdmVNb2RhbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Zpc2libGUnKTtcclxuXHJcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgIHRoaXMuZ2FtZVdyYXBwZXIucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbCk7XHJcbiAgICAgICAgdGhpcy5tb2RhbCA9IG51bGw7XHJcbiAgICAgICAgaWYgKCF0aGlzLmlzT3Zlcikge1xyXG4gICAgICAgICAgdGhpcy5wdXp6bGVHYW1lLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLmhhbmRsZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnB1enpsZUdhbWUuc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsICcwJyk7XHJcbiAgICAgICAgdGhpcy5wdXp6bGVHYW1lLmZvY3VzKCk7XHJcbiAgICAgIH0sIDUwICsgdGhpcy50aW1lKTtcclxuICAgIH07XHJcblxyXG4gICAgUHV6emxlLnByb3RvdHlwZS5jcmVhdGVNb2RhbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICBjb25zdCB0b3AgPSB0aGlzLnB1enpsZUdhbWUub2Zmc2V0VG9wO1xyXG4gICAgICBjb25zdCBsZWZ0ID0gdGhpcy5wdXp6bGVHYW1lLm9mZnNldExlZnQ7XHJcbiAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMucHV6emxlR2FtZS5vZmZzZXRIZWlnaHQ7XHJcblxyXG4gICAgICB0aGlzLm1vZGFsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCgncHJldmlldy1tb2RhbCcpO1xyXG4gICAgICB0aGlzLm1vZGFsLnN0eWxlLnRvcCA9IGAke3RvcH1weGA7XHJcbiAgICAgIHRoaXMubW9kYWwuc3R5bGUubGVmdCA9IGAke2xlZnR9cHhgO1xyXG4gICAgICB0aGlzLm1vZGFsLnN0eWxlLmhlaWdodCA9IGAke2hlaWdodH1weGA7XHJcbiAgICAgIHRoaXMuZ2FtZVdyYXBwZXIuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbCk7XHJcblxyXG4gICAgICBjb25zdCBpbWFnZVByZXZpZXcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgaW1hZ2VQcmV2aWV3LmNsYXNzTGlzdC5hZGQoJ2ltYWdlLXByZXZpZXcnKTtcclxuICAgICAgaW1hZ2VQcmV2aWV3LnN0eWxlLmJhY2tncm91bmRJbWFnZSA9IGB1cmwoJHt0aGlzLmltYWdlfSlgO1xyXG4gICAgICB0aGlzLm1vZGFsLmFwcGVuZENoaWxkKGltYWdlUHJldmlldyk7XHJcblxyXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcclxuICAgICAgICB0aGlzLnB1enpsZUdhbWUucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMuaGFuZGxlcik7XHJcbiAgICAgICAgdGhpcy5wdXp6bGVHYW1lLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAnLTEnKTtcclxuICAgICAgfSwgNTApO1xyXG4gICAgfTtcclxuXHJcbiAgICBQdXp6bGUucHJvdG90eXBlLnJlc2V0R2FtZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGlzLmdhbWVXcmFwcGVyLnJlbW92ZUNoaWxkKHRoaXMucHV6emxlR2FtZSk7XHJcblxyXG4gICAgICB0aGlzLmhpZGRlbkJsb2NrID0gbnVsbDtcclxuICAgICAgdGhpcy5oYW5kbGVyID0gbnVsbDtcclxuICAgICAgdGhpcy50aW1lID0gbnVsbDtcclxuICAgICAgdGhpcy5ibG9ja3MgPSBbXTtcclxuICAgICAgdGhpcy5jb3VudCA9IDA7XHJcbiAgICAgIHRoaXMuaXNPdmVyID0gZmFsc2U7XHJcbiAgICAgIHRoaXMucHV6emxlR2FtZSA9IG51bGw7XHJcbiAgICAgIHRoaXMuY291bnRFbGVtZW50LnRleHRDb250ZW50ID0gYExpY3piYSBydWNow7N3OiAke3RoaXMuY291bnR9YDtcclxuXHJcbiAgICAgIHRoaXMuY3JlYXRlUHV6emxlR2FtZUVsZW1lbnQoKTtcclxuICAgICAgdGhpcy5jcmVhdGVCbG9ja3MoKTtcclxuICAgICAgdGhpcy5hZGRCbG9ja3NUb1B1enpsZUdhbWUoKTtcclxuICAgICAgdGhpcy5hZGRFdmVudHNPblB1enpsZUdhbWUoKTtcclxuICAgIH07XHJcblxyXG4gICAgUHV6emxlLnByb3RvdHlwZS5jcmVhdGVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGlzLmRlc2NyaXB0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgIHRoaXMuZGVzY3JpcHRpb24uY2xhc3NMaXN0LmFkZCgnZ2FtZS1kZXNjcmlwdGlvbicpO1xyXG4gICAgICB0aGlzLmRlc2NyaXB0aW9uLmlubmVySFRNTCA9IGBcclxuICAgICAgPHA+PHNwYW4gY2xhc3M9XCJjb2xvclwiPkphayBncmHEhzo8L3NwYW4+IGtsaWtuaWogbmEgdWvFgmFkYW5rxJksIGplxbxlbGkgem1pZW5pxIUgc2nEmSBrb2xvcnkgb3puYWN6YSB0bywgxbxlIHVrxYJhZGFua2EgamVzdCBha3R5d25hLiBOYWNpc2thasSFYyBzdHJ6YcWCa2kgbmEga2xhd2lhdHVyemUgcHJ6ZXN1d2FqIHB1c3R5IGtsb2NlayBhYnkgdcWCb8W8ecSHIG9icmF6ZWsuPC9wPlxyXG4gICAgICA8cCBjbGFzcz1cImNvbG9yXCI+V2llZHosIMW8ZSB1a8WCYWRhbmvEmSBuaWUgemF3c3plIG1vxbxuYSB1xYJvxbx5xIcgcG9uaWV3YcW8IGlzdG5pZWplIHJ5enlrbyB3eXN0xIVwaWVuaWEgdyBvc3RhdG5pbSByesSZZHppZSBrb2xlam5vxZtjaSBrbG9ja8OzdyAxMy0xNS0xNCBpIGRsYSB0YWtpZWdvIHByenlwYWRrdSBwcnplc3Rhd2llbmllIGtsb2NrYSAxNSB6IGtsb2NraWVtIDE0IGplc3QgbmllbW/FvGxpd2UuPC9wPlxyXG4gICAgICBgO1xyXG4gICAgICB0aGlzLndyYXBwZXIuYXBwZW5kQ2hpbGQodGhpcy5kZXNjcmlwdGlvbik7XHJcbiAgICB9O1xyXG5cclxuICAgIFB1enpsZS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGlzLmNyZWF0ZUdhbWVXcmFwcGVyKCk7XHJcbiAgICAgIHRoaXMuY3JlYXRlQ291bnRlcigpO1xyXG4gICAgICB0aGlzLmNyZWF0ZVB1enpsZUdhbWVFbGVtZW50KCk7XHJcbiAgICAgIHRoaXMuY3JlYXRlQmxvY2tzKCk7XHJcbiAgICAgIHRoaXMuYWRkQmxvY2tzVG9QdXp6bGVHYW1lKCk7XHJcbiAgICAgIHRoaXMuYWRkRXZlbnRzT25QdXp6bGVHYW1lKCk7XHJcbiAgICAgIHRoaXMuY3JlYXRlQm90dG9tUGFuZWwoKTtcclxuICAgICAgdGhpcy5jcmVhdGVEZXNjcmlwdGlvbigpO1xyXG4gICAgICB0aGlzLmNoZWNrSW1hZ2VTaXplKCk7XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiBQdXp6bGU7XHJcbiAgfSkoKTtcclxuXHJcbiAgY29uc3QgcHV6emxlID0gbmV3IFB1enpsZSh7XHJcbiAgICB3cmFwcGVyOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucHV6emxlJyksXHJcbiAgICBpbWFnZTogJycgLy8gSGVyZSBpcyB5b3VyIHBhdGggdG8gdGhlIGltYWdlXHJcbiAgfSk7XHJcblxyXG4gIHB1enpsZS5pbml0KCk7XHJcbn0pKCk7XHJcbiJdLCJmaWxlIjoibWFpbi5qcyJ9
