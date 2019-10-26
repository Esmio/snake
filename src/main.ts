import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { animationFrame } from 'rxjs/scheduler/animationFrame';

import { interval } from 'rxjs/observable/interval';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { combineLatest } from 'rxjs/observable/combineLatest';
import { of } from 'rxjs/observable/of';
import { merge } from 'rxjs/observable/merge';

import {
  map,
  filter,
  startWith,
  scan,
  distinctUntilChanged,
  share,
  withLatestFrom,
  skip,
  tap,
  switchMap,
  takeWhile,
  first,
  mapTo,
  throttleTime,
} from 'rxjs/operators';

import { DIRECTIONS, SPEED, SNAKE_LENGTH, FPS, APPLE_COUNT, POINTS_PER_APPLE } from './constants';
import { Key, Point2D, Scene } from './types';
import {
  createCanvasElement,
  renderScene,
  renderApples,
  renderSnake,
  renderScore,
  renderGameOver,
  getRandomPosition,
  checkCollision,
} from './canvas';
import {
  isGameOver,
  nextDirection,
  move,
  eat,
  generateSnake,
  generateApples,
} from './utils';

let canvas = createCanvasElement();
let ctx = canvas.getContext('2d');
document.getElementById('game').appendChild(canvas);

const INITIAL_DIRECTION = DIRECTIONS[Key.RIGHT];

let tick$ = interval(SPEED);

let click$ = fromEvent(document, 'click');

let keydown$ = fromEvent(document, 'keydown');

let leftClick$ = fromEvent(document.getElementById('left'), 'click').pipe(mapTo(37),scan((key, _) => key));
let rightClick$ = fromEvent(document.getElementById('right'), 'click').pipe(mapTo(39), scan((key, _) => key));
let upClick$ = fromEvent(document.getElementById('up'), 'click').pipe(mapTo(38), scan((key, _) => key));
let downClick$ = fromEvent(document.getElementById('down'), 'click').pipe(mapTo(40), scan((key, _) => key));

let pageClick$ = merge(leftClick$, rightClick$, upClick$, downClick$).pipe(
  map(key => ({ keyCode: key })),
)

let eventStreem$ = merge(pageClick$, keydown$)

function createGame(fps$: Observable<number>): Observable<Scene> {

  let direction$ = eventStreem$.pipe(
    map((event: KeyboardEvent | {keyCode: number}) => DIRECTIONS[event.keyCode]),
    throttleTime(200),
    filter(direction => !!direction),
    startWith(INITIAL_DIRECTION),
    scan(nextDirection),
    distinctUntilChanged()
  );

  let length$ = new BehaviorSubject<number>(SNAKE_LENGTH);  // 初始蛇长

  let snakeLength$ = length$.pipe(
    scan((snakeLength, step) => snakeLength + step),
    share()
  );

  let score$ = snakeLength$.pipe(
    startWith(0),
    scan((score, _) => score + POINTS_PER_APPLE)
  );

  let snake$: Observable<Array<Point2D>> = tick$.pipe(
    withLatestFrom(direction$, snakeLength$, (_, direction, snakeLength) => [direction, snakeLength]),
    scan(move, generateSnake()), // 根据方向流和蛇身长流来产生蛇流，[{x: 1, y: 2}, ...]
    share() // snake$被scene$和apples$使用，保持一致性，使用Subject()多播
  );

  let apples$ = snake$.pipe(
    scan(eat, generateApples()),
    distinctUntilChanged(), // apples$会跟这snake$发出值，过滤重复
    share() // apples$也会被applesEaten 和 scene$订阅，使用share()保持数据一致
  );

  let appleEaten$ = apples$.pipe(
    skip(1),
    tap(() => length$.next(POINTS_PER_APPLE)), // 每次apples发出值，都让length$ next出去一分
  ).subscribe();

  let scene$ = combineLatest(snake$, apples$, score$, (snake, apples, score) => ({ snake, apples, score }));

  return fps$.pipe(withLatestFrom(scene$, (_, scene) => scene));

}

let game$ = of('Start Game').pipe(
  map(() => interval(1000 / FPS, animationFrame)),
  switchMap(createGame),
  takeWhile(scene => !isGameOver(scene)),
);

const startGame = () => game$.subscribe({
  next: (scene) => renderScene(ctx, scene),
  complete: () => {
    renderGameOver(ctx);
    click$.pipe(first()).subscribe(startGame);
  }
});

startGame();
