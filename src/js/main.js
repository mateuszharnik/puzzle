(() => {
  const Puzzle = (() => {
    function Puzzle(config) {
      if (!(this instanceof Puzzle)) {
        return new Puzzle(config);
      } else {
        const defaultConfig = {
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
        throw new Error(`Image must be type of string and can't be empty`);
      }
    };

    Puzzle.prototype.checkImageSize = function() {
      const img = new Image();

      img.src = this.image;

      img.addEventListener('load', () => {
        const imgHeight = img.naturalHeight;
        const imgWidth = img.naturalWidth;
        if (imgHeight > 500 || imgWidth > 500) {
          this.createWarning('duży');
        } else if (imgHeight < 400 || imgWidth < 400) {
          this.createWarning('mały');
        }
      });

      if (img.complete) {
        const event = new Event('load');
        img.dispatchEvent(event);
      }
    };

    Puzzle.prototype.createWarning = function(size) {
      const warning = document.createElement('div');
      warning.classList.add('big-img-error');
      warning.textContent = `Twój obrazek jest za ${size}. Wymiary obrazka powinny wynosić 400px x 400px. Mogą występować problemy z działaniem programu.`;
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
      this.countElement.textContent = `Liczba ruchów: ${this.count}`;
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
      let x = null;
      let j = null;

      for (let i = arr.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = arr[i];
        arr[i] = arr[j];
        arr[j] = x;
      }

      return arr;
    };

    Puzzle.prototype.createBlocks = function() {
      for (let i = 1; i <= 15; i++) {
        const block = document.createElement('div');
        block.classList.add(`puzzle`);
        block.classList.add(`img-${i < 10 ? '0' + i : i}`);
        block.style.backgroundImage = `url(${this.image})`;

        this.blocks.push(block);
      }

      this.blocks = this.arrayShuffle(this.blocks);
      this.blocks.forEach((block, index) => {
        block.classList.add(`puzzle-${index + 1 < 10 ? '0' + (index + 1) : index + 1}`);
      });

      this.blocks.push(this.createHiddenBlock());
    };

    Puzzle.prototype.createHiddenBlock = function() {
      // this.hiddenBlock is last element in puzzle
      this.hiddenBlock = document.createElement('div');
      this.hiddenBlock.classList.add(`puzzle`);
      this.hiddenBlock.classList.add(`img-16`);
      this.hiddenBlock.classList.add('puzzle-16');
      this.hiddenBlock.classList.add('hide');
      this.hiddenBlock.style.backgroundImage = `url(${this.image})`;
      return this.hiddenBlock;
    };

    Puzzle.prototype.addBlocksToPuzzleGame = function() {
      this.blocks.forEach(block => {
        this.puzzleGame.appendChild(block);
      });

      this.time = parseFloat(getComputedStyle(this.hiddenBlock).transitionDuration) * 1000;
    };

    Puzzle.prototype.addEventsOnPuzzleGame = function() {
      this.handler = this.throttle(this.checkWhatKeyIsPress, this.time);
      this.puzzleGame.addEventListener('keydown', this.handler);
      this.puzzleGame.addEventListener('focus', () => this.puzzleGame.parentElement.classList.add('is-focused'));
      this.puzzleGame.addEventListener('blur', () => this.puzzleGame.parentElement.classList.remove('is-focused'));
    };

    Puzzle.prototype.throttle = function(callback, time) {
      let wait = false;
      return e => {
        if (!wait) {
          wait = true;
          callback.call(this, e);
          setTimeout(() => {
            wait = false;
          }, time - 150);
        }
      };
    };

    Puzzle.prototype.isGameOver = function(end) {
      if (end) {
        setTimeout(() => {
          this.countElement.textContent = `Gratulacje - Twój wynik to ${this.count}`;
          this.hiddenBlock.classList.remove('hide');
          this.setInLocalStorage(this.count);
          this.isOver = true;
        }, this.time);

        this.puzzleGame.removeEventListener('keydown', this.handler);
      }
    };

    Puzzle.prototype.checkWhatKeyIsPress = function(e) {
      const key = e.keyCode;

      // For IE because e.target should be .puzzle-wrapper but is .puzzle
      if (e.target !== this.puzzleGame) {
        this.puzzleGame.focus();
      }

      this.isGameOver(this.changeDirection(key));
    };

    Puzzle.prototype.changeDirection = function(key) {
      const position = this.blocks.indexOf(this.hiddenBlock);

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
      this.countElement.textContent = `Liczba ruchów: ${this.count}`;
      return true;
    };

    Puzzle.prototype.changePositionInArray = function(hiddenEl, siblingEl) {
      const temp = this.blocks[siblingEl];

      // Swap hiddenEl with siblingEl in array
      this.blocks.splice(siblingEl, 1, this.blocks[hiddenEl]);
      this.blocks.splice(hiddenEl, 1, temp);
      return this.increaseCount();
    };

    Puzzle.prototype.changePuzzleBlock = function(hidden, sibling) {
      const hiddenElementClassName = `puzzle-${
        parseInt(hidden) + 1 < 10 ? '0' + (parseInt(hidden) + 1) : parseInt(hidden) + 1
      }`;
      const siblingElementClassName = `puzzle-${
        parseInt(sibling) + 1 < 10 ? '0' + (parseInt(sibling) + 1) : parseInt(sibling) + 1
      }`;

      this.blocks[hidden].classList.remove(hiddenElementClassName);
      this.blocks[hidden].classList.add(siblingElementClassName);
      this.blocks[sibling].classList.remove(siblingElementClassName);
      this.blocks[sibling].classList.add(hiddenElementClassName);

      return this.changePositionInArray(hidden, sibling);
    };

    Puzzle.prototype.checkOrder = function() {
      // This function check if game should be over
      const currentOrder = this.blocks.filter(block => {
        return (
          block.className.substr(block.className.indexOf('img-') + `img-`.length, 2) ===
          block.className.substr(block.className.indexOf('puzzle-') + `puzzle-`.length, 2)
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
          this.record.textContent = `Twój obecny rekord: ${score}`;
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
          this.record.textContent = `Brak rekordu`;
        } else {
          this.record.textContent = `Twój obecny rekord: ${Number(this.recordFromLocalStorage)}`;
        }
        this.bottomPanel.appendChild(this.record);
      }

      this.preview = document.createElement('button');
      this.preview.classList.add('puzzle-preview');
      this.preview.type = 'button';
      this.preview.title = 'Naciśnij lewy przycisk myszy aby zobaczyć podgląd';
      this.bottomPanel.appendChild(this.preview);

      const icon = document.createElement('i');
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
      this.modal.classList.remove('visible');

      setTimeout(() => {
        this.gameWrapper.removeChild(this.modal);
        this.modal = null;
        if (!this.isOver) {
          this.puzzleGame.addEventListener('keydown', this.handler);
        }
        this.puzzleGame.setAttribute('tabindex', '0');
        this.puzzleGame.focus();
      }, 50 + this.time);
    };

    Puzzle.prototype.createModal = function() {
      const top = this.puzzleGame.offsetTop;
      const left = this.puzzleGame.offsetLeft;
      const height = this.puzzleGame.offsetHeight;

      this.modal = document.createElement('div');
      this.modal.classList.add('preview-modal');
      this.modal.style.top = `${top}px`;
      this.modal.style.left = `${left}px`;
      this.modal.style.height = `${height}px`;
      this.gameWrapper.appendChild(this.modal);

      const imagePreview = document.createElement('div');
      imagePreview.classList.add('image-preview');
      imagePreview.style.backgroundImage = `url(${this.image})`;
      this.modal.appendChild(imagePreview);

      setTimeout(() => {
        this.modal.classList.add('visible');
        this.puzzleGame.removeEventListener('keydown', this.handler);
        this.puzzleGame.setAttribute('tabindex', '-1');
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
      this.countElement.textContent = `Liczba ruchów: ${this.count}`;

      this.createPuzzleGameElement();
      this.createBlocks();
      this.addBlocksToPuzzleGame();
      this.addEventsOnPuzzleGame();
    };

    Puzzle.prototype.createDescription = function() {
      this.description = document.createElement('div');
      this.description.classList.add('game-description');
      this.description.innerHTML = `
      <p><span class="color">Jak grać:</span> kliknij na układankę, jeżeli zmienią się kolory oznacza to, że układanka jest aktywna. Naciskając strzałki na klawiaturze przesuwaj pusty klocek aby ułożyć obrazek.</p>
      <p class="color">Wiedz, że układankę nie zawsze można ułożyć ponieważ istnieje ryzyko wystąpienia w ostatnim rzędzie kolejności klocków 13-15-14 i dla takiego przypadku przestawienie klocka 15 z klockiem 14 jest niemożliwe.</p>
      `;
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

  const puzzle = new Puzzle({
    wrapper: document.querySelector('.puzzle'),
    image: '' // Here is your path to the image
  });

  puzzle.init();
})();
