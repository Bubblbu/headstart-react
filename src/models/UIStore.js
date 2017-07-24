import { extendObservable, autorun } from "mobx";
import {scaleLinear} from 'd3-scale';
import PapersModel from './PapersModel';
import BubblesModel from './BubblesModel';

class UIStore {
  constructor(domainStore, initSize) {
    let papersStore = new PapersModel(domainStore.papersObject);
    let bubblesStore = new BubblesModel(domainStore.bubblesObject);
    this.isZoomed = false;
    this.papersStore = papersStore;
    this.bubblesStore = bubblesStore;

    this.previousSVGSize = initSize - 65;
    this.previousListSize = initSize - 65;

    extendObservable(this, {
      data : { areas: domainStore.areasObject },
      progress : 0,
      svgWidth: this.previousSVGSize,
      svgHeight: this.previousSVGSize,
      subtitleHeight: 65,
      listWidth: this.previousListSize,
      forceSimParameters: {
        manyBodyForceStrength: 1000,
        collisionForceRadius: this.previousSVGSize / 8.,
        bubblesAlphaMin: 0.8,
        papersAlphaMin: 0.008,
        centerXForceStrength: 0.5,
        centerYForceStrength: 0.5,
      },
      paperZoomFactor: 2.,
      paperListHeight: this.previousSVGSize + 65 - 113,
      paperExplorerHeight: "113px",
      bubbleCenterOffset: 0,
      paperWidth: 30,
      paperHeight: 40,
      forceSimIsDone: false,
      zoomFactor: 1.,
      translationVecX: 0.,
      translationVecY: 0.,
      searchString: "",
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      displayList: true,
      showInfoModal: false,
      sortOption: null
    });

    this.initCoords(this.svgWidth);
  }

    disposer()
    {
      autorun(() => {
        if ((this.papersStore.hasSelectedEntities ||
            this.bubblesStore.hasSelectedEntities)) {

          this.isZoomed = true;
          let node = this.bubblesStore.selectedEntities;
          if (node.length > 0) {
            this.updateZoomState(node[0], this);
            this.updateCoords();
          }

        } else if (!(this.papersStore.hasSelectedEntities && this.bubblesStore.hasSelectedEntities)
            && this.isZoomed === true) {

          this.isZoomed = false;
          this.resetZoomState(this);
          this.updateCoords();

        }
      });
    }

  getVisColOrWindowWidth(size) {
    // const headstartContainer = window.document.querySelector(".vis-col");
    // const newSize = (window.innerHeight < headstartContainer.clientWidth ? window.innerHeight : headstartContainer.clientWidth) - this.subtitleHeight;
    this.previousSVGSize = size;
    this.previousListSize = size;
  }

  updateZoomState(node) {
    this.zoomFactor = this.svgWidth * 0.5 / node.orig_r;
    this.translationVecX = this.svgWidth * 0.5 - this.zoomFactor * node.orig_x;
    this.translationVecY = this.svgHeight * 0.5 - this.zoomFactor * node.orig_y;
  }

  updateCoords() {
    const zoomFactor = this.zoomFactor;
    const translationVecX = this.translationVecX;
    const translationVecY = this.translationVecY;

    this.papersStore.entities.forEach((paper) => {
      paper.x = (zoomFactor*paper.orig_x + translationVecX);
      paper.y = (zoomFactor*paper.orig_y + translationVecY);
      paper.width =  zoomFactor*paper.orig_width;
      paper.height =  zoomFactor*paper.orig_height;
      paper.fontsize = zoomFactor*paper.orig_fontsize;
    });

    this.bubblesStore.entities.forEach((node) => {
      node.x = (this.zoomFactor*node.orig_x + this.translationVecX);
      node.y = (this.zoomFactor*node.orig_y + this.translationVecY);
      node.r = (this.zoomFactor*node.orig_r);
    });
  }

  resetZoomState() {
    this.zoomFactor = 1.;
    this.translationVecX = 0.;
    this.translationVecY = 0.;
  }


  initCoords(range) {
    const max = Math.max(
      Math.max(...this.papersStore.entities.map((entity) => entity.x)),
      Math.max(...this.papersStore.entities.map((entity) => entity.y)));
    const min = Math.min(
      Math.min(...this.papersStore.entities.map((entity) => entity.x)),
      Math.min(...this.papersStore.entities.map((entity) => entity.y)));
    const maxReaders = Math.max(...this.bubblesStore.entities.map((entity) => entity.readers));
    const minReaders = Math.min(...this.bubblesStore.entities.map((entity) => entity.readers));
    let scale = scaleLinear().domain([min, max]).range([0, range]);
    let radiusScale = scaleLinear().domain([minReaders, maxReaders]).range([range/11., range/6.]);

    this.papersStore.entities.forEach((entity) => {
      entity.x = scale(entity.x);
      entity.y = scale(entity.y);
      entity.meanx = scale(entity.meanx);
      entity.meany = scale(entity.meany);
    });

    this.bubblesStore.entities.forEach((entity) => {
      entity.x = scale(entity.x);
      entity.y = scale(entity.y);
      entity.r = radiusScale(entity.readers);
    });
  }
  
  getChartSize(width) {
    let SVGSize = (window.innerHeight < width ? window.innerHeight : width) - this.subtitleHeight;
    return SVGSize;
  }
  
  updateChartSize(width, check) {
    if (!check) {
      let newSVGSize = this.getChartSize(width);
      this.previousSVGSize = this.svgWidth;
      this.previousListSize = this.listWidth;
      this.svgWidth = newSVGSize;
      this.svgHeight = newSVGSize;
      this.paperListHeight = newSVGSize + this.subtitleHeight - 113;
      this.bubblesStore.onWindowResize(this.previousSVGSize, newSVGSize);
      this.papersStore.onWindowResize(this.previousSVGSize, newSVGSize);
      this.updateCoords();
    }
  }

}

export default UIStore;
