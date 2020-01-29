// ==UserScript==
// @name         /* @echo name */
// @namespace    k00lagin.enhanced-sier
// @updateURL    https://raw.githubusercontent.com/k00lagin/enhanced-sier/master/main.js
// @version      /* @echo version */
// @description  /* @echo description */
// @author       /* @echo author */
// @match        http://172.153.153.48/*
// @grant        GM_addStyle
// ==/UserScript==


(function () {
	'use strict';

	let ES = {
		aliases: {
			719747: 'прописка',
			723392: 'права',
			727489: 'снилс',
		}
	};

	const React = {
		events: {
			onKeyUp: 'keyup',
			onClick: 'click'
		},
		createElement: function (tag, attrs, ...children) {
			var element = document.createElement(tag);

			for (let name in attrs) {
				if (name && attrs.hasOwnProperty(name)) {
					let value = attrs[name];
					if (name === 'className') {
						element.className = value.toString();
					}
					else if (this.events[name]) {
						element.addEventListener(this.events[name], value);
					}
					else if (value === true) {
						element.setAttribute(name, name);
					} else if (value !== false && value != null) {
						element.setAttribute(name, value.toString());
					}
				}
			}
			children.forEach(child => {
				element.appendChild(
					child.nodeType == null ?
						document.createTextNode(child.toString()) : child);
			});
			return element;
		}
	};

	function checkLoadState() {
		if (!document.querySelector('.navigation.navigation-main')) {
			return;
		}
		else {
			init();
		}
	}

	async function getServiceList() {
		window.serviceList = [];
		let response = await fetch('http://172.153.153.48/api/v1/search/subservices', {
			method: 'POST',
			headers: {
				Accept: 'application/hal+json',
				Authorization: 'Bearer ' + localStorage.accessToken,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				'search': {
					'search': [{
						'field': 'units.id',
						'operator': 'eq',
						'value': '58bd51815744bf06e001b57b'
					}]
				},
				'size': 200,
				'sort': 'serviceCode,DESC',
				'prj': 'servicesList'
			})
		});
		if (response.ok) {
			let subservices = await response.json();
			subservices = subservices.content
			subservices.forEach(subservice => {
				let service = {
					id: subservice._id,
					sid: subservice.serviceId.split('_')[3],
					name: subservice.serviceName
				}
				window.serviceList.push(service);
			});

		} else {
			console.warn('Ошибка HTTP: ' + response.status);
		}
	}

	function getFilteredList(string) {
		let words = string.split(' ');
		let filteredList = serviceList.filter(service => {
			return words.every(word => {
				if (ES.aliases[service.sid] && ES.aliases[service.sid].indexOf(word) !== -1) {
					return true;
				}
				if (service.sid.indexOf(word) !== -1) {
					return true;
				}
				if (service.name.indexOf(word) !== -1) {
					return true;
				}
			});
		});
		return filteredList;
	}

	function plantServiceSearchTrigger() {
		let serviceSearchTrigger = (
			<button className="service-search-trigger icon-magic-wand"
			onClick={openServiceSearchDialog}></button>
		)
		let navigationContainer = document.querySelector('.navigation.navigation-main');
		navigationContainer.appendChild(serviceSearchTrigger);
	}

	function checkSearchTrigger() {
		if (!document.querySelector('.navigation.navigation-main .service-search-trigger')) {
			plantServiceSearchTrigger();
		}
	}

	function init() {
		getServiceList();
		plantServiceSearchTrigger();
		clearInterval(initInterval);
		ES.fixSearchTriggerInterval = setInterval(checkSearchTrigger, 500);
		createServiceSearchDialog()
		document.body.addEventListener('keyup', handleESKeyup);
		GM_addStyle(`/* @echo style */`);
	}

	function createServiceSearchDialog() {
		let dialog = (
			<dialog className="service-search-dialog hidden">
				<header className="dialog-header">
					<span className="dialog-title">Начало нового дела</span>
					<button className="dialog__close-trigger icon-cross" onClick={closeServiceSearchDialog}></button>
				</header>
				<input className="service-search-input form-control" type="text"
				onKeyUp={handleSearchKeyup} placeholder="Часть названия услуги, её код, или псевдоним..."></input>
				<ul className="service-list-node"></ul>
			</dialog>
		)
		document.body.appendChild(dialog);
	}

	function updateServiceList() {
		let filteredList = [];
		let serviceListNode = document.querySelector('.service-list-node');
		if (document.querySelector('.service-search-input').value === '') {
			filteredList = serviceList;
		}
		else {
			filteredList = getFilteredList(document.querySelector('.service-search-input').value);
		}
		serviceListNode.innerHTML = '';
		filteredList.forEach(service => {
			let listItem = (
				<li>
					<span className="service-code">{service.sid} </span>
					<a className="service-link" tabindex="0"
					href={ 'http://172.153.153.48/ais/appeals/create/' + service.id }>
						{service.name}
					</a>
				</li>
			);
			serviceListNode.appendChild(listItem);
		})
	}

	function openServiceSearchDialog() {
		document.querySelector('.service-search-input').value = '';
		updateServiceList();
		document.querySelector('.service-search-dialog').classList.remove('hidden');
		document.querySelector('.service-search-input').focus();
	}
	function closeServiceSearchDialog() {
		document.querySelector('.service-search-dialog').classList.add('hidden');
	}

	function handleSearchKeyup(e) {
		if (e.key === 'Enter' && document.querySelector('.service-search-dialog li:first-child > a')) {
			document.querySelector('.service-search-dialog li:first-child > a').click();
		}
		else {
			updateServiceList();
		}
	}

	function handleESKeyup(e) {
		if (e.key === 'Escape' && document.querySelector('.service-search-dialog:not(.hidden)')) {
			closeServiceSearchDialog();
		}
	}

	let initInterval = setInterval(checkLoadState, 100);
})();
