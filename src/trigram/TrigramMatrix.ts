import { defaultBadSamples, defaultGoodSamples, DEFAULT_CHARS_TO_INCLUDE } from '../utils/constants'
import { frankensteinTrainingText } from '../data/nlp-frankenstein'
import { CutoffScore, CutoffScoreStrictness } from '..'
import { getCharCodeMap } from '../utils/helpers'
import { createEmptyTrigramMatrix, getTrigramCutoffScores, runTextThroughTrigramMatrix, trainTrigramMatrix } from './trigramHelpers'

export interface TrigramMatrixLayer {
    countLayer: number[][]
    layerTotal: number
}

interface TrigramMatrixConstructorOptions {
    initialTrainingText?: string
    goodSamples?: string[]
    badSamples?: string[]
    additionalCharsToInclude?: string
}

interface TrigramMatrixInterface {
    trigramMatrix: TrigramMatrixLayer[]
    cutoffScores: CutoffScore

    train: (text: string) => void
    getScore: (text: string) => number
    recalibrateCutoffScores: (goodSamples?: string[], badSamples?: string[]) => void
    isGibberish: (text: string, strictness?: CutoffScoreStrictness) => boolean
}

export class TrigramMatrix implements TrigramMatrixInterface {
    alphaSize: number
    trigramMatrix: TrigramMatrixLayer[]
    cutoffScores: CutoffScore
    charCodeMap: { [key: number]: number }

    constructor(options: TrigramMatrixConstructorOptions = {}) {
        const { initialTrainingText = frankensteinTrainingText, goodSamples = defaultGoodSamples, badSamples = defaultBadSamples, additionalCharsToInclude = '' } = options
        const { charCodeMap, uniqueChars } = getCharCodeMap(DEFAULT_CHARS_TO_INCLUDE + additionalCharsToInclude)
        this.charCodeMap = charCodeMap
        this.alphaSize = uniqueChars
        this.trigramMatrix = createEmptyTrigramMatrix(uniqueChars)
        this.train(initialTrainingText)
        this.cutoffScores = getTrigramCutoffScores(this.trigramMatrix, goodSamples, badSamples, charCodeMap)
    }

    train = (trainingText: string): void => {
        trainTrigramMatrix(this.trigramMatrix, trainingText, this.charCodeMap)
    }

    getScore = (textToScore: string): number => {
        return runTextThroughTrigramMatrix(this.trigramMatrix, textToScore, this.charCodeMap)
    }

    recalibrateCutoffScores = (goodSamples = defaultGoodSamples, badSamples = defaultBadSamples): void => {
        this.cutoffScores = getTrigramCutoffScores(this.trigramMatrix, goodSamples, badSamples, this.charCodeMap)
    }

    isGibberish = (text: string, strictness = CutoffScoreStrictness.Avg): boolean => {
        const { low, med, hi } = this.cutoffScores
        const cutoff = strictness === CutoffScoreStrictness.Strict ? low : strictness === CutoffScoreStrictness.Avg ? med : hi
        return this.getScore(text) < cutoff
    }
}